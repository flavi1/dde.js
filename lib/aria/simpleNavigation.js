const simpleNavigation = (function() {
	
	const debug = true;
	const alreadyEhanced = new Map();
	
	const undo = (el) => {
		if (!el) {
			return false;
		}
		
		if (el.nodeType === Node.DOCUMENT_NODE) {
			el = dom.documentElement;
		}
		const listenerToRemove = alreadyEhanced.get(el);
		el.removeEventListener('keydown', listenerToRemove, true)
		return alreadyEhanced.delete(el);
	}
	
	const apply = (dom) => {
		if (!dom) {
			return false;
		}
		
		if (dom.nodeType === Node.DOCUMENT_NODE) {
			dom = dom.documentElement;
		}
	
	
		const containerSelector = '[role="tablist"], [role="radiogroup"], [role="listbox"]'
		const itemSelector = '[role="tab"], [role="radio"], [role="option"]'
		
		var rootContainers = [];
		for(candidate of dom.querySelectorAll(containerSelector)) {
			if(!candidate.parentElement.closest(containerSelector))
				rootContainers.push(candidate);
		}
		
		console.log(rootContainers)
		
		for(c of rootContainers) {
			let firstItem = c.querySelector(itemSelector);
			for(candidate of c.querySelectorAll(itemSelector))
				if(candidate.getAttribute('aria-selected') === 'true' || candidate.getAttribute('aria-checked') === 'true') {
					firstItem = candidate
					break;
				}
			firstItem.tabIndex = 0;
			c.querySelectorAll(itemSelector).forEach((item) => {if(item != firstItem) item.tabIndex = -1})
		}
		function getContainer(el) {
			return el.parentElement.closest(containerSelector);
		}
		
		function getItems(container) {
			var items = []
			for(candidate of container.querySelectorAll(itemSelector))
				if(getContainer(candidate) == container)
					items.push(candidate);
			return items;
		}
		
		function prev(container, el) {	// + todo order css prop ?
			const items = getItems(container)
			for(let i = 0; i < items.length; i++)
				if(items[i] == el) {
					if(i === 0)
						return items[items.length - 1]
					return items[i - 1];
				}
		}
		
		function next(container, el) {	// + todo order css prop ?
			const items = getItems(container)
			for(let i = 0; i < items.length; i++)
				if(items[i] == el) {
					if(i === items.length - 1)
						return items[0]
					return items[i + 1];
				}
		}
		
		function handler(ev) {	// TODO : dir="rtl" attr + direction css prop
			const el = ev.target;
			if(el.matches(itemSelector)) {
				console.log(ev.code) // ArrowDown ArrowUp ArrowRight ArrowLeft
				// todo orientation? code => next / prev
				// (next / prev will need getParent)
				const container = getContainer(el);

				if(!container)
					return;
				var moveTo = null;
				
				if(!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code))
					return;
				
				moveTo = ['ArrowLeft', 'ArrowUp'].includes(ev.code) ? prev(container, el) : next(container, el);

				if(moveTo) {
					el.tabIndex = -1;
					moveTo.tabIndex = 0;
					moveTo.focus();
					console.log(moveTo)
					if(el.role === 'radio' || el.role === 'tab' && container.hasAttribute('data-automatic'))
					return moveTo.dispatchEvent(new CustomEvent(el.role === 'tab' ? 'expand' : 'default', {
						bubbles:true
					}));
				}
			}
		}
	
		alreadyEhanced.set(dom, handler);
		dom.addEventListener('keydown', handler, true);
		
		dom.querySelectorAll('*').forEach((el) => {
			if(alreadyEhanced.has(el))
				undo(el)
		})
	
	}
	
	
	return {
		apply,
		undo,
		alreadyEhanced
	};
    
})();
