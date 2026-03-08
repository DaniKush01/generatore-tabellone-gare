/* js/admin_only.js
   Reindirizza al menu se l’utente NON è admin
*/
(function () {

  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

  if (!isAdmin) {
      window.location.href = 'menu.html';
  }

})();
