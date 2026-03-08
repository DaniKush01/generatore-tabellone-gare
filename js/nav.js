// nav.js – controlli base per navbar fissa
document.addEventListener('DOMContentLoaded', function () {
  var back = document.getElementById('navBack');
  var fwd  = document.getElementById('navFwd');
  var home = document.getElementById('navHome');

  if (back) back.addEventListener('click', function(){ history.back(); });
  if (fwd)  fwd.addEventListener('click',  function(){ history.forward(); });
  if (home) home.addEventListener('click', function(){ location.href = 'menu.html'; });
});
