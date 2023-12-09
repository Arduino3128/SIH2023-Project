var message_type;

function afterLoader() {
	if (message_type == "invalid_creds"){
		Swal.fire({
		  title: 'Invalid Credentials!',
		  text: 'Please Try Again with Correct Credentials!',
		  icon: 'error',
		  confirmButtonText: 'Okay',
		});
	}
}

function showMessage(message_type_param) {
	message_type = message_type_param;
}
