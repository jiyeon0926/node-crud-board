function welcomeJoin() {

    const nameInput = document.getElementById('name');
    const idInput = document.getElementById('id');
    const passwordInput = document.getElementById('password');
    const birthInput = document.getElementById('birth');
    const emailInput = document.getElementById('email');

    if (nameInput.value === '' || idInput.value === '' || passwordInput.value === '' || birthInput.value === '' || emailInput.value === '') {
        alert('입력되지 않은 부분이 있습니다.');
    } else {
        alert('회원가입을 완료하였습니다.');
    }
};

function limitBirth() {
    const birthInput = document.getElementById('birth');

    if (birthInput.value.length > 8) {
        alert('생년월일 8자리를 입력하세요.');
        return false;
    }
    return true;
};