const t = document.getElementById('test')
if(t) {
	const s = t.attachShadow({mode: 'open'})
	s.innerHTML = "YOUPI ça marche!"
}
