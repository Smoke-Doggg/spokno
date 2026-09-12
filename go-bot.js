(function () {
  var ALLOWED = ["digitalfreedom", "aieasy", "svoizagranicey", "saverbot"];
  var params = new URLSearchParams(location.search);
  var src = params.get("src");
  if (src && ALLOWED.indexOf(src) !== -1) {
    try {
      sessionStorage.setItem("vpnp_ref", JSON.stringify({src: src, ts: Date.now()}));
    } catch (e) {  }
    try {
      fetch("https://stat.prostokey.com/watch-api/ref?src=" + encodeURIComponent(src) + "&evt=land",
            {mode: "no-cors", keepalive: true});
    } catch (e) {}
  }
  location.replace("/");
})();
