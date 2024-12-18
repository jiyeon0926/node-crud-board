function limitTitle() {
    const titleInput = document.getElementById('title');
    
    if (titleInput.value.length > 15) {
        alert('제목은 15자 이하여야 합니다.');
        return false;
    }
    return true;
};