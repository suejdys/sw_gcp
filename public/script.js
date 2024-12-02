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

    const result = await response.json();
    console.log(result.message);

    // // ȸ������ ���� �� �α��� �������� �����̷�Ʈ
    // if (response.ok) {
    //     window.location.href = "/";  // �α��� �������� �̵�
    // }
});

// 로그인 처리

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // �⺻ �� ���� ���� ����
    
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (response.ok) {
        alert(result.message); // 성공 메시지 표시
    } else {
        console.log(response.status, response.statusText); // 상태 코드와 텍스트 확인
        alert(result.message || "Login failed");
    }
    const result = await response.json(); // 응답을 텍스트로 가져옴
    console.log(result); // 그대로 알림에 띄움

    // �α��� ���� ��, welcome.html�� �����̷�Ʈ
    if (response.ok) {
        window.location.href = `/welcome?username=${result.username}`; // ����� �̸��� URL ���� �Ķ���ͷ� ����
    }
});
