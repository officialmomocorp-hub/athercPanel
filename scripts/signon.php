<?php
$session_file = '/opt/aether-panel/pma_sessions.json';

// Helper to clean expired sessions
function clean_expired_sessions($file) {
    if (!file_exists($file)) return;
    $data = json_decode(file_get_contents($file), true) ?: [];
    $now = time();
    $changed = false;
    foreach ($data as $token => $session) {
        if ($now > $session['expires']) {
            unset($data[$token]);
            $changed = true;
        }
    }
    if ($changed) {
        file_put_contents($file, json_encode($data));
    }
}

clean_expired_sessions($session_file);

if (isset($_GET['token'])) {
    $token = $_GET['token'];
    if (file_exists($session_file)) {
        $data = json_decode(file_get_contents($session_file), true) ?: [];
        if (isset($data[$token])) {
            $session_data = $data[$token];
            if (time() <= $session_data['expires']) {
                // Remove token to make it single-use
                unset($data[$token]);
                file_put_contents($session_file, json_encode($data));

                // Start phpMyAdmin session
                session_set_cookie_params(0, '/phpmyadmin/', '', false, true);
                session_name('SignonSession');
                session_start();
                $_SESSION['PMA_single_signon_user'] = $session_data['user'];
                $_SESSION['PMA_single_signon_password'] = $session_data['pass'];
                $_SESSION['PMA_single_signon_host'] = 'localhost';
                $_SESSION['PMA_single_signon_port'] = 3306;

                header('Location: /phpmyadmin/index.php');
                exit;
            }
        }
    }
}

// Fallback: If no token or token invalid, show manual login form
if (isset($_POST['pma_username']) && isset($_POST['pma_password'])) {
    $user = $_POST['pma_username'];
    $pass = $_POST['pma_password'];

    // Test MySQL connection using mysqli
    $conn = @new mysqli('localhost', $user, $pass);
    if (!$conn->connect_error) {
        $conn->close();

        // Start session and log in
        session_set_cookie_params(0, '/phpmyadmin/', '', false, true);
        session_name('SignonSession');
        session_start();
        $_SESSION['PMA_single_signon_user'] = $user;
        $_SESSION['PMA_single_signon_password'] = $pass;
        $_SESSION['PMA_single_signon_host'] = 'localhost';
        $_SESSION['PMA_single_signon_port'] = 3306;

        header('Location: /phpmyadmin/index.php');
        exit;
    } else {
        $error = "Cannot log in to the MySQL server: " . $conn->connect_error;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>phpMyAdmin - Login</title>
    <style>
        body {
            font-family: sans-serif;
            background-color: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .login-box {
            background: white;
            border: 1px solid #ccc;
            padding: 30px;
            border-radius: 8px;
            width: 320px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h2 {
            margin-top: 0;
            font-size: 18px;
            color: #555;
            text-align: center;
        }
        .error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-bottom: 15px;
            border: 1px solid #f5c6cb;
        }
        .input-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box;
        }
        input[type="submit"] {
            width: 100%;
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        }
        input[type="submit"]:hover {
            background-color: #4338ca;
        }
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo img {
            width: 160px;
        }
    </style>
</head>
<body>
    <div class="login-box">
        <div class="logo">
            <img src="/phpmyadmin/themes/pmahomme/img/logo_left.png" alt="phpMyAdmin">
        </div>
        <h2>Welcome to phpMyAdmin</h2>
        <?php if (isset($error)): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        <form method="post">
            <div class="input-group">
                <label for="pma_username">Username</label>
                <input type="text" id="pma_username" name="pma_username" required>
            </div>
            <div class="input-group">
                <label for="pma_password">Password</label>
                <input type="password" id="pma_password" name="pma_password" required>
            </div>
            <input type="submit" value="Log in">
        </form>
    </div>
</body>
</html>
