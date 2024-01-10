
const clickListener = (ev) => {
	
	const debug = true;
	
	function isDisabled(el) {
		if(el.getAttribute('aria-disabled') === 'true' || el.matches('[aria-disabled] el'))
			return true;
		return false;
	}
	
	const reDispatchEvent = (ev, as) => {
		const newtEv = new CustomEvent(as, {
		  detail: {
			from: ev,
		  },
		  bubbles:true
		});

		return ev.target.dispatchEvent(newtEv);
	}



	const el = ev.target;
	
	if(isDisabled(el)) {
		ev.stopImmediatePropagation();
		if (debug) console.log('STOPPROPAGATION ' + ev.type, el);
		return reDispatchEvent(ev, 'stoppropagation')
	} else {
		reDispatchEvent(ev, 'default')
		reDispatchEvent(ev, 'expand')
//console.log('click => dispatch to default + expand', el)
	}
}
