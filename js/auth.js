// auth.js – verifica sessione e popola sessionStorage
(function () {
  'use strict';

  var PUBLIC_PAGES = ['index.html', 'richiesta_credenziali.html', 'verify_email.html'];

  function isPublic() {
    var path = location.pathname.split('/').pop() || 'index.html';
    return PUBLIC_PAGES.indexOf(path) !== -1;
  }

  function redirectToLogin() {
    sessionStorage.clear();
    if (!isPublic()) location.href = 'index.html';
  }

  fetch('/gestione_gare/me.php', { credentials: 'include' })
    .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, data: j }; }); })
    .then(function (res) {

      if (!res.ok || !res.data || !res.data.ok) {
        if (isPublic()) return;
        redirectToLogin();
        return;
      }

      sessionStorage.setItem('role', res.data.role || 'user');
      sessionStorage.setItem('palestra', res.data.palestra || '');
      sessionStorage.setItem('isAdmin', String(res.data.role === 'admin'));

      var file = location.pathname.split('/').pop();
      if (file === '' || file === 'index.html') location.href = 'menu.html';

    })
    .catch(function () {
      if (!isPublic()) redirectToLogin();
    });

})();
