// 회원가입 처리
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // �⺻ �� ���� ���� ����
    
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.text();
    alert(result);

    // // ȸ������ ���� �� �α��� �������� �����̷�Ʈ
    // if (response.ok) {
    //     window.location.href = "/";  // �α��� �������� �̵�
    // }
});

// 로그인 처리

document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // �⺻ �� ���� ���� ����
    
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.text();
    try {
        const parsedResult = JSON.parse(result); // 텍스트를 JSON으로 파싱
        alert(parsedResult.message); // 메시지만 alert로 출력
    } catch (e) {
        alert(result); // JSON 파싱 실패 시 원본 텍스트 출력
    }
    // �α��� ���� ��, welcome.html�� �����̷�Ʈ
    if (response.ok) {
        window.location.href = `/welcome?username=${result.username}`; // ����� �̸��� URL ���� �Ķ���ͷ� ����
    }
});
