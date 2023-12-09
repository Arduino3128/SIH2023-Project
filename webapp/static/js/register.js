var message_type;

document.addEventListener('DOMContentLoaded', function () {
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirm_password');
	const submitButton = document.getElementById('submit');
	const infoField = document.getElementById('info');	
    
    function checkPasswords() {
		if (passwordField.value!==""){
	        if (passwordField.value === confirmPasswordField.value) {
	            submitButton.disabled = false;
				submitButton.style.cursor = "pointer";
				infoField.innerHTML = "";
				
	        } else {
	            submitButton.disabled = true;
				submitButton.style.cursor = "not-allowed";
				infoField.innerHTML = "Passwords do not match!";
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

function afterLoader() {
	if (message_type == "invalid_creds"){
		Swal.fire({
		  title: 'Invalid Credentials!',
		  text: 'Please Try Again with Different Credentials!',
		  icon: 'error',
		  confirmButtonText: 'Okay',
		});
	}
}

function showMessage(message_type_param) {
	message_type = message_type_param;
}
