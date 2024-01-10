const dialog = (msg, buttons) => {
	const modal = document.createElement('dialog')
	const close = document.createElement('button')
	const form = document.createElement('form')
	modal.classList.add('dde-dialog');
	modal.innerHTML += '<div class="body">'+msg+'</div>'
	
	close.classList.add('close');
	close.textContent = 'X'
	form.setAttribute('method', 'dialog')
	modal.prepend(close)
	close.addEventListener('click', (ev) => {modal.close(); console.log('CLOSE?');})
	let lastButton;
	for(name in buttons) {
		let b = document.createElement('button')
		b.textContent = name
		b.addEventListener('click', (ev) => {buttons[name].call(b, ev); modal.close();})
		form.append(b)
		lastButton = b
	}
/*	
	modal.addEventListener('click', function(event) {	// from https://stackoverflow.com/questions/25864259/how-to-close-the-new-html-dialog-tag-by-clicking-on-its-backdrop
	  var rect = modal.getBoundingClientRect();
	  var isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
		rect.left <= event.clientX && event.clientX <= rect.left + rect.width);
	  if (!isInDialog) {
		modal.close();
	  }
	});
*/
	
	modal.append(form)
	document.body.append(modal)
	modal.showModal();
	lastButton.focus(); // last button
}

