exports.logout = (req, res) => {
    res.clearCookie('jwt');
    return res.redirect('/login');
};