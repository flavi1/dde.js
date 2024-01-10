const nestedNavigation = (function() {
	
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
	
	
		const containerSelector = '[role="menu"], [role="menubar"], [role="tree"], [role="group"]'	// menubar visualy persistant, not menu
		const itemSelector = '[role="menuitem"], [role="menuitemradio"], [role=" menuitemcheckbox"], [role="treeitem"]'
		
		var rootContainers = [];
		for(candidate of dom.querySelectorAll(containerSelector)) {
			if(!candidate.parentElement.closest(containerSelector) && candidate.role !== 'group')
				rootContainers.push(candidate);
		}
		
		console.log(rootContainers)
		
		for(c of rootContainers) {
			let firstItem = c.querySelector(itemSelector);
			firstItem.tabIndex = 0;
			c.querySelectorAll(itemSelector).forEach((item) => {if(item != firstItem) item.tabIndex = -1})
		}
		
		function getOrientation(container) {
			const attrVal = container.getAttribute('aria-orientation')
			if(attrVal)
				if(['horizontal', 'vertical', 'undefined'].includes(attrVal))
					return attrVal;
				else
					return 'undefined';
			var role = container.role || container.getAttribute('role');
			if(role == 'group')
				while(container && role == 'group') {
					container = getContainer(container)
					role = container.role || container.getAttribute('role')
				}
			if(!container)
				return 'undefined';
			if(['slider', 'tablist', 'toolbar', 'menubar'].includes(role))
				return 'horizontal';
			if(['scrollbar', 'tree', 'listbox', 'menu'].includes(role))
				return 'vertical';
			return 'undefined'
		}
		
		function getContainer(el) {
			return el.parentElement.closest(containerSelector);
		}
		
		function getRootContainer(el) {
			for(c of rootContainers)
				if(c.contains(el))
					return c;
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
		
		const toggle = (el) => {
			const potentialsHandlers = el.children
			for(c of potentialsHandlers)
				if(c.hasAttribute('data-expand-handler'))
					el = c;
			return el.dispatchEvent(new CustomEvent('expand', {
				bubbles:true
			}));
		}
		
		function getFirstItemFromControlled(el) {
			for(cel of ariaResolver.getControlledElements(dom, el))
				return cel.querySelector(itemSelector)
		}
		
		function open(el) {
			if(el.getAttribute('aria-expanded') === 'false')
				toggle(el)
			console.log('open')
			let firstItem = getFirstItemFromControlled(el)
			let rootContainer = getRootContainer(el)
			for(item of rootContainer.querySelectorAll(itemSelector)) {
				if(item != firstItem)
					item.tabIndex = -1;
				else
					item.tabIndex = 0;
			}
			if(firstItem)
				firstItem.focus();
		}
/*
		function close(el) {
			const container = getContainer(el);
			//const newEl = ariaResolver.controlledBy.get(container);
			if(!container)
				return;
			el.tabIndex = -1;
			//if(newEl.getAttribute('aria-expanded') === 'true')
			console.log(container)
				toggle(container)
			console.log('close', el, container)
			container.tabIndex = 0;
			container.focus();
		}
*/

		function close(el) {
			const container = getContainer(el);
			const newEl = ariaResolver.controlledBy.get(container);
			if(!container || !newEl)
				return;
			el.tabIndex = -1;
			//if(newEl.getAttribute('aria-expanded') === 'true')
			console.log(newEl)
				toggle(newEl)
			console.log('close', el, newEl)
			newEl.tabIndex = 0;
			newEl.focus();
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
				const orientation = getOrientation(container);
				var moveTo = null;
console.log(orientation)
				if(orientation === 'horizontal') {
					if(['ArrowLeft', 'ArrowRight'].includes(ev.code))
						moveTo = ev.code === 'ArrowLeft' ? prev(container, el) : next(container, el);
					if(['ArrowUp', 'ArrowDown'].includes(ev.code))
						moveTo = ev.code === 'ArrowUp' ? close(el) : open(el);
				} else if(orientation === 'vertical') {
					if(['ArrowUp', 'ArrowDown'].includes(ev.code))
						moveTo = ev.code === 'ArrowUp' ? prev(container, el) : next(container, el);
					if(['ArrowLeft', 'ArrowRight'].includes(ev.code))
						moveTo = ev.code === 'ArrowLeft' ? close(el) : open(el);
				}
				if(moveTo) {
					el.tabIndex = -1;
					moveTo.tabIndex = 0;
					moveTo.focus();
					console.log(moveTo)
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
