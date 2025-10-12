<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram WebApp Test</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status {
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover { background: #0056b3; }
        pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            direction: ltr;
            text-align: left;
        }
        .section {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Telegram WebApp Test</h1>
        <p>این صفحه برای تست Telegram Mini App طراحی شده است.</p>

        <div class="section">
            <h2>1️⃣ وضعیت محیط</h2>
            <div id="environment-status"></div>
        </div>

        <div class="section">
            <h2>2️⃣ اطلاعات کاربر تلگرام</h2>
            <div id="user-info"></div>
        </div>

        <div class="section">
            <h2>3️⃣ InitData</h2>
            <button onclick="showInitData()">نمایش InitData</button>
            <div id="init-data-display"></div>
        </div>

        <div class="section">
            <h2>4️⃣ تست احراز هویت</h2>
            <input type="text" id="api-url" placeholder="API URL" value="http://localhost:8001/api" style="width: 100%; padding: 8px; margin: 10px 0;">
            <button onclick="testAuth()">تست ورود</button>
            <div id="auth-result"></div>
        </div>

        <div class="section">
            <h2>5️⃣ Telegram WebApp Methods</h2>
            <button onclick="expandApp()">Expand</button>
            <button onclick="closeApp()">Close</button>
            <button onclick="showAlert()">Alert</button>
            <button onclick="vibrate()">Vibrate</button>
        </div>
    </div>

    <script>
        // Initialize
        window.addEventListener('load', function() {
            checkEnvironment();
            displayUserInfo();
        });

        function checkEnvironment() {
            const statusDiv = document.getElementById('environment-status');
            
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                statusDiv.innerHTML = `
                    <div class="status success">
                        ✅ Telegram WebApp API موجود است
                    </div>
                    <ul style="text-align: right;">
                        <li>Version: ${tg.version}</li>
                        <li>Platform: ${tg.platform}</li>
                        <li>Color Scheme: ${tg.colorScheme}</li>
                        <li>Expanded: ${tg.isExpanded ? 'Yes' : 'No'}</li>
                        <li>InitData: ${tg.initData ? 'Available' : 'Not available'}</li>
                    </ul>
                `;
                
                // Mark as ready
                tg.ready();
            } else {
                statusDiv.innerHTML = `
                    <div class="status error">
                        ❌ Telegram WebApp API در دسترس نیست
                    </div>
                    <p style="text-align: right;">این صفحه باید از طریق منوی ربات تلگرام باز شود.</p>
                `;
            }
        }

        function displayUserInfo() {
            const userDiv = document.getElementById('user-info');
            
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user) {
                const user = window.Telegram.WebApp.initDataUnsafe.user;
                userDiv.innerHTML = `
                    <div class="status info">
                        اطلاعات کاربر از Telegram دریافت شد:
                    </div>
                    <pre>${JSON.stringify(user, null, 2)}</pre>
                `;
            } else {
                userDiv.innerHTML = `
                    <div class="status error">
                        اطلاعات کاربر در دسترس نیست
                    </div>
                `;
            }
        }

        function showInitData() {
            const displayDiv = document.getElementById('init-data-display');
            
            if (window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                displayDiv.innerHTML = `
                    <h3 style="text-align: right;">initData String:</h3>
                    <pre>${tg.initData || 'Not available'}</pre>
                    
                    <h3 style="text-align: right;">initDataUnsafe Object:</h3>
                    <pre>${JSON.stringify(tg.initDataUnsafe, null, 2)}</pre>
                `;
            } else {
                displayDiv.innerHTML = `
                    <div class="status error">
                        InitData در دسترس نیست
                    </div>
                `;
            }
        }

        async function testAuth() {
            const resultDiv = document.getElementById('auth-result');
            const apiUrl = document.getElementById('api-url').value;
            
            if (!window.Telegram || !window.Telegram.WebApp || !window.Telegram.WebApp.initData) {
                resultDiv.innerHTML = `
                    <div class="status error">
                        ❌ InitData در دسترس نیست. باید از طریق Telegram باز شود.
                    </div>
                `;
                return;
            }

            const tg = window.Telegram.WebApp;
            
            resultDiv.innerHTML = `
                <div class="status info">
                    🔄 در حال ارسال درخواست...
                </div>
            `;

            try {
                const response = await fetch(`${apiUrl}/auth/telegram-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        init_data: tg.initData,
                        init_data_unsafe: tg.initDataUnsafe
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.innerHTML = `
                        <div class="status success">
                            ✅ ورود موفقیت‌آمیز بود!
                        </div>
                        <h3 style="text-align: right;">Access Token:</h3>
                        <pre>${data.access_token.substring(0, 100)}...</pre>
                        <p style="text-align: right;">Token Type: ${data.token_type}</p>
                    `;
                    
                    // Try to fetch user profile
                    await testUserProfile(apiUrl, data.access_token);
                } else {
                    resultDiv.innerHTML = `
                        <div class="status error">
                            ❌ خطا در ورود
                        </div>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="status error">
                        ❌ خطا در اتصال به سرور
                    </div>
                    <p style="text-align: right;">${error.message}</p>
                `;
            }
        }

        async function testUserProfile(apiUrl, token) {
            const resultDiv = document.getElementById('auth-result');
            
            try {
                const response = await fetch(`${apiUrl}/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const user = await response.json();

                if (response.ok) {
                    resultDiv.innerHTML += `
                        <h3 style="text-align: right;">اطلاعات پروفایل کاربر:</h3>
                        <pre>${JSON.stringify(user, null, 2)}</pre>
                    `;
                } else {
                    resultDiv.innerHTML += `
                        <div class="status error">
                            ⚠️ خطا در دریافت پروفایل
                        </div>
                        <pre>${JSON.stringify(user, null, 2)}</pre>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML += `
                    <div class="status error">
                        ⚠️ خطا در دریافت پروفایل: ${error.message}
                    </div>
                `;
            }
        }

        // Telegram WebApp Methods
        function expandApp() {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.expand();
            }
        }

        function closeApp() {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.close();
            }
        }

        function showAlert() {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.showAlert('این یک پیام تست است!');
            }
        }

        function vibrate() {
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
        }
    </script>
</body>
</html>

