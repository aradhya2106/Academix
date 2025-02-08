const jwt = require('jsonwebtoken');

function checkAuth(req, res, next) {
    const authToken = req.cookies.authToken;
    const refreshToken = req.cookies.refreshToken;

    // If no tokens are provided, reject the request
    if (!authToken || !refreshToken) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Verify the auth token
    jwt.verify(authToken, process.env.JWT_SECRET_KEY, (err, decoded) => {
        if (err) {
            // If auth token is invalid, attempt to verify the refresh token
            jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY, (refreshErr, refreshDecoded) => {
                if (refreshErr) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                // If refresh token is valid, issue new tokens
                const newAuthToken = jwt.sign({ userId: refreshDecoded.userId }, process.env.JWT_SECRET_KEY, { expiresIn: '1d' });
                const newRefreshToken = jwt.sign({ userId: refreshDecoded.userId }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '10d' });

                // Set new tokens in cookies
                res.cookie('authToken', newAuthToken, {
                    sameSite: 'none',
                    httpOnly: true,
                    secure: true, // Ensure your app is served over HTTPS for this to work
                });

                res.cookie('refreshToken', newRefreshToken, {
                    sameSite: 'none',
                    httpOnly: true,
                    secure: true, // Ensure your app is served over HTTPS for this to work
                });

                // Attach userId to the request object for further use
                req.user = { userId: refreshDecoded.userId };
                req.ok = true;
                req.message = "Authentication successful";
                next();
            });
        } else {
            // If auth token is valid, proceed with the user data
            req.user = { userId: decoded.userId };
            req.ok = true;
            req.message = "Authentication successful";
            next();
        }
    });
}

module.exports = checkAuth;
