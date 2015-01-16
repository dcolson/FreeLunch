/**
 * GET /
 * Home page.
 */
exports.index = function(req, res) {
  res.render('home', {
    title: 'Home'
  });
};

exports.overflow = function(req, res) {
  res.render('overflow', {
    title: 'Landing Page'
  });
};