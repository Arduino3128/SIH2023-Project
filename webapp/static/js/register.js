document.addEventListener('DOMContentLoaded', function () {
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm_password');
    const submitButton = document.getElementById('submit');
    
    function checkPasswords() {
		if (passwordField.value!==""){
	        if (passwordField.value === confirmPasswordField.value) {
	            submitButton.disabled = false;
	        } else {
	            submitButton.disabled = true;
	        }
		}
    }

    passwordField.addEventListener('input', checkPasswords);
    confirmPasswordField.addEventListener('input', checkPasswords);

    document.getElementById('register_form').addEventListener('submit', function (event) {
	    if (passwordField.value!==""){    
			if (passwordField.value !== confirmPasswordField.value) {
	            alert("Passwords do not match.");
	            event.preventDefault();
	        }
		}
    });
});
