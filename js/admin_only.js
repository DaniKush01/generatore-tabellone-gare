/* js/admin_only.js
   Reindirizza al menu se l’utente NON è admin
*/
(function () {

  // controllo ruolo
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
  if (!isAdmin) {
      // puoi cambiare destinazione o mostrare un messaggio a piacere
      window.location.href = 'menu.html';
  }
})();
