// 회원가입 처리
document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // 기본 폼 제출 동작 방지
            
            // 사용자 입력값 가져오기
            const username = document.querySelector('#registerForm [name="username"]').value;
            const password = document.querySelector('#registerForm [name="password"]').value;

            try {
                // 서버에 회원가입 요청
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json(); // JSON 응답 파싱
                alert(result.message);

                // 회원가입 성공 시, 로그인 페이지로 이동
                if (response.ok) {
                    window.location.href = "/"; // 로그인 페이지로 리다이렉트
                }
            } catch (error) {
                console.error("Error during registration:", error);
                alert("회원가입 중 오류가 발생했습니다.");
            }
        });
    }
});

// 로그인 처리
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault(); // 기본 폼 제출 동작 방지 (GET 요청 방지)

            const username = document.querySelector('#loginForm [name="username"]').value;
            const password = document.querySelector('#loginForm [name="password"]').value;

            try {
                const response = await fetch('/login', {
                    method: 'POST', // POST 요청으로 설정
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }) // JSON 데이터 전송
                });

                const result = await response.json();
                if (response.ok) {
                    console.log(result.message);
                    window.location.href = '/main.html';
                } else {
                    alert(result.message || "로그인에 실패했습니다.");
                }
            } catch (error) {
                console.error("Error during login:", error);
                alert("로그인 중 오류가 발생했습니다.");
            }
        });
    }
});
