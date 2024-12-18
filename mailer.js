const nodeMailer = require('nodemailer');

// nodemailer를 사용하여 이메일 전송
const sendEmail = (email, type, data) => {
    const transporter = nodeMailer.createTransport({
        service: 'naver',
        auth: {
            user: 'wldus2499@naver.com', // 관리자 이메일
            pass: '73C8DFPHR1FT' // 관리자 비밀번호
        }
    });

    let mailOptions;

    if (type === 'id') {
        mailOptions = {
            from: 'wldus2499@naver.com',
            to: email,
            subject: '아이디 찾기 결과',
            text: `회원님의 아이디는 ${data} 입니다.`
        };
    } else if (type === 'password') {
        mailOptions = {
            from: 'wldus2499@naver.com',
            to: email,
            subject: '임시 비밀번호',
            text: `임시 비밀번호: ${data}`
        };
    }

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.error('이메일 전송 오류:', error);
        } else {
            console.log('이메일 전송 성공:');
        }
    });
};

module.exports = sendEmail; // 모듈로 내보내기