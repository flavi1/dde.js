window.addEventListener("DOMContentLoaded", (event) => {
	document.addEventListener('click', clickListener , true);
	actionnable.apply(document);
	toggableStates.apply(document);
	simpleNavigation.apply(document);
	nestedNavigation.apply(document);
	console.log('ARIA chargé!')
});

