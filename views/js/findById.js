function find() {

    const nameInput = document.getElementById('name');
    const birthInput = document.getElementById('birth');
    const emailInput = document.getElementById('email');

    if (nameInput.value === '' || birthInput.value === '' || emailInput.value === '') {
        alert('입력되지 않은 부분이 있습니다.');
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

function warningEmail() {
    const emailInput = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailInput.value)) {
        alert('이메일 형식이 아닙니다.');
        return false;
    }
    return true;
};