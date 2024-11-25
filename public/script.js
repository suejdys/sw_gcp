// ȸ������ ó��
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

// �α��� ó��
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // �⺻ �� ���� ���� ����
    
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    alert(result.message); // �α��� �޽��� alert
    
    // �α��� ���� ��, welcome.html�� �����̷�Ʈ
    if (response.ok) {
        window.location.href = `/welcome?username=${result.username}`; // ����� �̸��� URL ���� �Ķ���ͷ� ����
    }
});
