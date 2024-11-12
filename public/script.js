// 회원가입 처리
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // 기본 폼 제출 동작 방지
    
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.text();
    alert(result);

    // 회원가입 성공 후 로그인 페이지로 리다이렉트
    if (response.ok) {
        window.location.href = "/";  // 로그인 페이지로 이동
    }
});

// 로그인 처리
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // 기본 폼 제출 동작 방지
    
    const username = document.querySelector('[name="username"]').value;
    const password = document.querySelector('[name="password"]').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    alert(result.message); // 로그인 메시지 alert
    
    // 로그인 성공 후, welcome.html로 리다이렉트
    if (response.ok) {
        window.location.href = `/welcome?username=${result.username}`; // 사용자 이름을 URL 쿼리 파라미터로 전달
    }
});
