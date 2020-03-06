// Start tests
$(document).ready(function() {
  $.ajax({
    url: "/run",
    success: (reportID) => {
      location.href = '/?report=' + reportID;
    }
  });
});