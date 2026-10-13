(function () {
  var ALLOWED = ["digitalfreedom", "aieasy", "svoizagranicey", "saverbot", "vidkeep"];
  var params = new URLSearchParams(location.search);
  var src = params.get("src");
  if (src && ALLOWED.indexOf(src) !== -1) {
    try {
      sessionStorage.setItem("vpnp_ref", JSON.stringify({src: src, ts: Date.now()}));
    } catch (e) {  }
    var url = "https://stat.prostokey.com/watch-api/ref?src=" + encodeURIComponent(src) + "&evt=land";
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon(url))) {
        fetch(url, {mode: "no-cors", keepalive: true});
      }
    } catch (e) {}
  }
  location.replace("/");
})();
