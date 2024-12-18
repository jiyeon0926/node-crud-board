function successLogin() {

    const idInput = document.getElementById('id');
    const passwordInput = document.getElementById('password');

    if (idInput.value === '' || passwordInput.value === '') {
        alert('아이디 또는 비밀번호를 입력하지 않았습니다.');
    }
};