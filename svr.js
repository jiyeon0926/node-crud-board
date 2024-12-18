const express = require('express');
const session = require('express-session');
const path = require('path');
const mailer = require('./mailer');
const static = require('serve-static');
const db = require('./db');
const port = 3000;

const app = express();

app.set('view engine', 'ejs'); // ejs를 사용하도록 설정

// 세션 미들웨어 설정
app.use(session({
    secret: 'my_secret_key', // 세션을 암호화하기 위한 비밀 키
    resave: false, // 세션 데이터가 변경이 있을 때만 저장
    saveUninitialized: false // 세션 필요 시에만 세션 초기화
}));

// 기타 미들웨어 설정
app.use(express.urlencoded({ extended: true })); // 클라이언트에서 URL-encoded 형식의 데이터를 전송
app.use(express.json()); // 클라이언트에서 데이터를 json 형식으로 전송
app.use('/views', static(path.join(__dirname, 'views'))); // 정적 파일을 제공

// 게시판 목록 날짜 ex) <td><%= formatDate(board.created_date) %></td>
app.locals.formatDate = function (dateString) {
    const date = new Date(dateString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// 홈(게시판 목록)
app.get('/', (req, res) => {
    const pageSize = 12; // 한 페이지당 게시물 12개
    const page = req.query.page || 1; // 페이지 번호 기본값 1
    const startIndex = (page - 1) * pageSize; // DB에서 가져올 게시물의 시작 위치를 계산

    // 전체 게시물 수 측정
    db.query('select count(*) as totalCount from board', (error, countResult) => {
        if (error) {
            console.error('쿼리 실행 중 오류 발생: ', error);
            res.status(500).send('내부 서버 오류');
        } else {
            const totalCount = countResult[0].totalCount;

            // 전체 페이지 수 계산
            const totalPages = Math.ceil(totalCount / pageSize);

            // 페이징 및 조회순 정렬
            db.query('select * from board order by viewCount desc limit ?,?',
                [startIndex, pageSize],
                (error, results) => {
                    if (error) {
                        console.error('쿼리 실행 중 오류 발생: ', error);
                        res.status(500).send('내부 서버 오류');
                    } else {
                        res.render('board/home', {
                            user: req.session.user,
                            boards: results,
                            currentPage: parseInt(page),
                            totalPages: totalPages,
                            pageSize: pageSize
                        });
                    }
                });
        }
    });
});

// 회원가입 폼
app.get('/join', (req, res) => {
    res.render('member/join');
});

// 회원가입
app.post('/join', (req, res) => {
    const userId = req.body.id;
    const userName = req.body.name;
    const userPassword = req.body.password;
    const userEmail = req.body.email;
    const userBirth = req.body.birth;

    // member 테이블에 저장 및 예외처리
    // SHA2(?,512): password 해싱
    db.query('insert into member (id, name, password, email, birth) values (?,?,SHA2(?,512),?,?)',
        [userId, userName, userPassword, userEmail, userBirth],
        (error) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                console.log('회원가입 완료');
                res.redirect('/login');
            }
        });
});

// 회원 아이디 찾기 폼
app.get('/members/findByid', (req, res) => {
    res.render('member/findById');
});

// 회원 아이디 찾기
app.post('/members/findByid', (req, res) => {
    const memberName = req.body.name;
    const memberBirth = req.body.birth;
    const memberEmail = req.body.email;

    // member 테이블에서 회원 정보 조회
    db.query('select id from member where name = ? and birth = ? and email = ?',
        [memberName, memberBirth, memberEmail],
        (error, results) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생:', error);
                res.status(500).send('내부 서버 오류');
            } else {

                if (results.length > 0) {
                    // 일치한 사용자에게 이메일로 아이디 전송
                    const findById = results[0].id;
                    mailer(memberEmail, 'id', findById);

                    res.redirect('/login');
                } else {
                    // 사용자가 일치하지 않을 경우
                    res.send('해당 사용자를 찾을 수 없습니다.');
                }
            }
        });
});

// 회원 비밀번호 찾기 폼
app.get('/members/findByPassword', (req, res) => {
    res.render('member/findByPassword');
});

// 회원 임시 비밀번호 전송
app.post('/members/findByPassword', (req, res) => {
    const memberId = req.body.id;
    const memberName = req.body.name;
    const memberBirth = req.body.birth;
    const memberEmail = req.body.email;

    // member 테이블에서 회원 정보 조회
    db.query('select * from member where id = ? and name = ? and birth = ? and email = ?',
        [memberId, memberName, memberBirth, memberEmail],
        (error) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생:', error);
                res.status(500).send('내부 서버 오류');
            } else {
                // 임시 비밀번호 생성
                function generateTemporaryPassword() {
                    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                    const passwordLength = 8;
                    let temporaryPassword = '';

                    for (let i = 0; i < passwordLength; i++) {
                        // characters 내에서 랜덤으로 임시 비밀번호 8자리 생성
                        const randomIndex = Math.floor(Math.random() * characters.length);
                        temporaryPassword += characters.charAt(randomIndex);
                    }

                    return temporaryPassword;
                }

                const temporary = generateTemporaryPassword();

                // member 테이블 업데이트
                db.query('update member set password = ? where email = ?',
                    [temporary, memberEmail],
                    (error) => {
                        if (error) {
                            console.error('쿼리 실행 중 오류 발생:', error);
                            res.status(500).send('내부 서버 오류');
                        } else {
                            mailer(memberEmail, 'password', temporary); // 임시 비밀번호 이메일 전송
                            res.redirect('/reset-password');
                        }
                    });

            };

        });
});

// 회원 비밀번호 재설정 폼
app.get('/reset-password', (req, res) => {
    res.render('member/reset-password');
})

// 회원 비밀번호 재설정
app.post('/reset-password', (req, res) => {
    const memberPassword = req.body.password; // 이메일로 전송받은 임시 비밀번호
    const newPassword = req.body.new; // 입력할 새로운 비밀번호

    db.query('select * from member where password = ?',
        [memberPassword],
        (error, results) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생:', error);
                res.status(500).send('내부 서버 오류');
            } else {

                if (results.length > 0) {
                    const memberId = results[0].id;

                    db.query('update member set password = SHA2(?,512) where id = ?',
                        [newPassword, memberId],
                        (error) => {
                            if (error) {
                                console.error('쿼리 실행 중 오류 발생:', error);
                                res.status(500).send('내부 서버 오류');
                            } else {
                                console.log('비밀번호 재설정 완료');
                                res.redirect('/login');
                            }
                        });
                } else {
                    res.send('임시 비밀번호가 일치하지 않습니다.');
                }
            }
        })
});

// 로그인 폼
app.get('/login', (req, res) => {
    res.render('member/login');
});

// 로그인
app.post('/login', (req, res) => {
    const memberId = req.body.id;
    const memberPassword = req.body.password;

    console.log('로그인 요청 ' + memberId + ' ' + memberPassword);

    db.query('select id, name from member where id=? and password = SHA2(?,512)',
        [memberId, memberPassword],
        (error, rows) => {
            if (error) {
                console.error('로그인 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
                return;
            }

            // rows : select 쿼리의 결과로부터 반환되는 행을 의미하는 변수
            if (rows.length > 0) {
                // 로그인 성공
                const user = rows[0]; // 조회된 결과 중 첫 번째 행을 가져와 user에 할당
                req.session.user = { id: user.id }; // 아이디를 세션에 저장
                console.log('로그인 성공');
                res.redirect('/');
            } else {
                // 로그인 실패
                console.log('로그인 실패');
                res.redirect('/join');
            }

            // 로그인 이후 세션에 저장된 사용자 정보 확인
            if (req.session.user) {
                console.log('세션에 사용자 정보 있음:', req.session.user);
            } else {
                console.log('세션에 사용자 정보 없음');
            }
        });
});

// 회원탈퇴
app.get('/delete/:id', (req, res) => {
    // 로그인할 때 세션에 저장된 아이디 가져오기
    const memberId = req.session.user.id;

    // member 테이블에서 회원 삭제 및 예외처리
    db.query('delete from member where id = ?',
        [memberId],
        (error) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                req.session.destroy();
                console.log('회원탈퇴 완료');
                res.redirect('/');
            }
        });
});

// 로그아웃
app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('오류 발생: ', error);
            console.log('세션에 사용자 정보 있음:', req.session.user);
        } else {
            console.log('로그아웃 완료');
            res.redirect('/');
        }
    });
});

// 게시물 작성 폼
app.get('/board/create', (req, res) => {
    if (req.session.user) {
        res.render('board/create');
    } else {
        res.redirect('/login');
    }
});

// 게시물 작성
app.post('/board/create', (req, res) => {
    const boardTitle = req.body.title;
    const boardAuthor = req.session.user.id;
    const boardContent = req.body.content;

    // board 테이블에 게시물 저장 및 예외처리
    db.query('insert into board (title, id, content, created_date, viewCount) values (?,?,?,now(6),0)',
        [boardTitle, boardAuthor, boardContent],
        (error) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                console.log('게시물 작성 완료');

                // MySQL DB 내의 게시물 번호(no) 정리
                const noCounter = 'set @counter = 0';
                const updateNo = 'update board set no = (@counter := @counter + 1)';

                db.query(noCounter);
                db.query(updateNo);
                console.log('DB 내의 게시물 번호 정리 완료');

                res.redirect('/');
            }
        });
});

// 게시물 읽기 및 댓글 목록 폼
app.get('/board/read/:no', (req, res) => {
    const paramsNo = req.params.no;

    if (req.session.user) {
        // 게시물 조회
        db.query('select * from board where no = ?',
            [paramsNo],
            (error, boardResults) => {
                if (error) {
                    console.error('쿼리 실행 중 오류 발생: ', error);
                } else {
                    // 조회수 증가
                    if (boardResults.length > 0) {
                        const currentViewCount = boardResults[0].viewCount;
                        const increaseViewCount = currentViewCount + 1;

                        // 게시물 업데이트
                        db.query('update board set viewCount = ? where no = ?',
                            [increaseViewCount, paramsNo],
                            (error) => {
                                if (error) {
                                    console.error('쿼리 실행 중 오류 발생: ', error);
                                    res.status(500).send('내부 서버 오류');
                                } else {
                                    console.log('조회수 증가 완료');

                                    const pageSize = 10; // 한 페이지당 댓글 10개
                                    const page = req.query.page || 1; // 페이지 번호 기본값 1
                                    const startIndex = (page - 1) * pageSize; // DB에서 가져올 댓글의 시작 위치를 계산

                                    // 전체 댓글 수 측정
                                    db.query('select count(*) as totalCount from comment where board_no = ?',
                                        [paramsNo],
                                        (error, countResult) => {
                                            if (error) {
                                                console.error('쿼리 실행 중 오류 발생: ', error);
                                                res.status(500).send('내부 서버 오류');
                                            } else {
                                                const totalCount = countResult[0].totalCount;

                                                // 댓글 전체 페이지 수 계산
                                                const totalPages = Math.ceil(totalCount / pageSize);

                                                // 댓글 페이징 및 최신순 정렬
                                                db.query('select * from comment where board_no = ? order by created_date desc limit ?,?',
                                                    [paramsNo, startIndex, pageSize],
                                                    (error, commentResults) => {
                                                        if (error) {
                                                            console.error('쿼리 실행 중 오류 발생: ', error);
                                                            res.status(500).send('내부 서버 오류');
                                                        } else {
                                                            res.render('board/read', {
                                                                boards: boardResults,
                                                                comments: commentResults,
                                                                currentPage: parseInt(page),
                                                                totalPages: totalPages,
                                                                pageSize: pageSize
                                                            });
                                                        }
                                                    });
                                            }
                                        });
                                }
                            });
                    } else {
                        console.log('해당 게시물이 없습니다.');
                        res.send('해당 게시물이 없습니다.');
                    }
                }
            });
    } else {
        res.redirect('/login');
    }
});

// 댓글 작성
app.post('/board/read/:no', (req, res) => {
    const paramsNo = req.params.no;
    const commentId = req.session.user.id;
    const commentContent = req.body.content;

    // comment 테이블에 댓글 저장 및 예외처리
    db.query('insert into comment (id, content, created_date, board_no) values (?,?,now(6),?)',
        [commentId, commentContent, paramsNo],
        (error) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                console.log('댓글 작성 완료');

                // MySQL DB 내의 댓글 번호(comment_no) 정리
                const noCounter = 'set @counter = 0';
                const updateNo = 'update comment set comment_no = (@counter := @counter + 1)';

                db.query(noCounter);
                db.query(updateNo);
                console.log('DB 내의 댓글 번호 정리 완료');

                res.redirect('/.');
            }
        });
});

// 댓글 삭제
app.get('/board/delete/:no/comment/:comment_no', (req, res) => {
    const paramsNo = req.params.no;
    const commentNo = req.params.comment_no;

    db.query('select id from comment where board_no = ?',
        [paramsNo],
        (error, results) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                // 댓글 작성자와 현재 로그인 사용자가 일치하는지 확인
                if (results[0].id === req.session.user.id) {
                    db.query('delete from comment where comment_no = ?',
                        [commentNo],
                        (error) => {
                            if (error) {
                                console.error('쿼리 실행 중 오류 발생: ', error);
                                res.status(500).send('내부 서버 오류');
                            } else {
                                console.log('댓글 삭제 완료');

                                // MySQL DB 내의 댓글 번호(comment_no) 정리
                                const noCounter = 'set @counter = 0';
                                const updateNo = 'update comment set comment_no = (@counter := @counter + 1)';

                                db.query(noCounter);
                                db.query(updateNo);
                                console.log('DB 내의 댓글 번호 정리 완료');

                                res.redirect('/');
                            }
                        });
                } else {
                    // 댓글 작성자와 현재 로그인된 사용자가 다른 경우
                    res.status(403).send('삭제 권한이 없습니다.');
                }
            }
        });
});

// 게시물 삭제
app.get('/board/delete/:no', (req, res) => {
    const paramsNo = req.params.no;

    db.query('select id from board where no = ?',
        [paramsNo],
        (error, results) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                // 게시물 작성자와 현재 로그인 사용자가 일치하는지 확인
                if (results[0].id === req.session.user.id) {
                    // 외래 키 제약조건 해제
                    db.query('set foreign_key_checks = 0',
                        (error) => {
                            if (error) {
                                console.error('외래 키 제약 조건 해제 중 오류 발생: ', error);
                                res.status(500).send('내부 서버 오류');
                            } else {
                                // 1. 게시물 삭제 전 해당 게시물의 모든 댓글 삭제
                                db.query('delete from comment where board_no = ?',
                                    [paramsNo],
                                    (error) => {
                                        if (error) {
                                            console.error('쿼리 실행 중 오류 발생: ', error);
                                            res.status(500).send('내부 서버 오류');
                                        } else {
                                            console.log('댓글 삭제 완료');
                                        }
                                    });

                                // 2. 게시물 삭제
                                db.query('delete from board where no = ?',
                                    [paramsNo],
                                    (error) => {
                                        if (error) {
                                            console.error('쿼리 실행 중 오류 발생: ', error);
                                            res.status(500).send('내부 서버 오류');
                                        } else {
                                            console.log('게시물 삭제 완료');

                                            // MySQL DB 내의 게시물 번호(no) 정리
                                            const noCounter = 'set @counter = 0';
                                            const updateNo = 'update board set no = (@counter := @counter + 1)';

                                            db.query(noCounter);
                                            db.query(updateNo);
                                            console.log('DB 내의 게시물 번호 정리 완료');

                                            res.redirect('/');
                                        }
                                    });
                            }
                        });
                } else {
                    // 게시물 작성자와 현재 로그인된 사용자가 다른 경우
                    res.status(403).send('삭제 권한이 없습니다.');
                }
            }
        });
});

// 게시물 수정 폼
app.get('/board/update/:no', (req, res) => {
    const paramsNo = req.params.no;

    db.query('select * from board where no = ?',
        [paramsNo],
        (error, results) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                // 게시물 작성자와 현재 로그인 사용자가 일치하는지 확인
                if (results[0].id === req.session.user.id) {
                    res.render('board/update', { boards: results });
                } else {
                    // 게시물 작성자와 현재 로그인된 사용자가 다른 경우
                    res.status(403).send('수정 권한이 없습니다.');
                }
            }
        });
});

// 게시물 수정
app.post('/board/update/:no', (req, res) => {
    const paramsNo = req.params.no;
    const boardTitle = req.body.title;
    const boardContent = req.body.content;
    const boardDate = req.body.created_date || new Date(); // 수정일

    db.query('update board set title = ?, content = ?, created_date = ? where no = ?',
        [boardTitle, boardContent, boardDate, paramsNo],
        (error) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                console.log('게시물 수정 완료');

                // MySQL DB 내의 게시물 번호(no) 정리
                const noCounter = 'set @counter = 0';
                const updateNo = 'update board set no = (@counter := @counter + 1)';

                db.query(noCounter);
                db.query(updateNo);
                console.log('DB 내의 게시물 번호 정리 완료');

                res.redirect('/');
            }
        });
});

// 동일한 작성자가 작성한 게시물만 조회
app.get('/board/myList', (req, res) => {
    if (req.session.user) {
        const memberId = req.session.user.id; // 세션에 저장한 작성자 아이디
        const pageSize = 10; // 한 페이지당 게시물 10개
        const page = req.query.page || 1; // 페이지 번호 기본값 1
        const startIndex = (page - 1) * pageSize;

        // 전체 게시물 수 측정
        db.query('select count(*) as totalCount from board', (error, countResult) => {
            if (error) {
                console.error('쿼리 실행 중 오류 발생: ', error);
                res.status(500).send('내부 서버 오류');
            } else {
                const totalCount = countResult[0].totalCount;

                // 전체 페이지 수 계산
                const totalPages = Math.ceil(totalCount / pageSize);

                // 페이징 및 최신순 정렬
                db.query('select * from board where id = ? order by created_date desc limit ?,?',
                    [memberId, startIndex, pageSize],
                    (error, results) => {
                        if (error) {
                            console.error('쿼리 실행 중 오류 발생: ', error);
                            res.status(500).send('내부 서버 오류');
                        } else {
                            console.log(memberId + ' 작성한 글만 보기')

                            res.render('board/myList', {
                                memberId,
                                boards: results,
                                currentPage: parseInt(page),
                                totalPages: totalPages,
                                pageSize: pageSize
                            });
                        }
                    });
            }
        });
    } else {
        res.redirect('/login');
    }
});

// 서버 시작 로그
app.listen(port, () => {
    console.log(`Server running at localhost:${port}`);
});