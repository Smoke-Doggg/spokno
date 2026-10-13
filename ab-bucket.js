(function () {
  var AID_KEY = 'vpnp_aid';
  var aid = (function () {
    try {
      var v = localStorage.getItem(AID_KEY);
      if (v) return v;
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(AID_KEY, v);
      return v;
    } catch (e) {
      // приватный режим браузера — бакет будет новым на каждой загрузке,
      // это терпимо для теста, не критично
      return 'no-storage-' + Math.random().toString(36).slice(2);
    }
  })();
  var fnv1a = function (str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h >>> 0;
  };
  var bucketValue = function (testKey) {
    return fnv1a(aid + '.' + String(testKey)) / 4294967296;
  };
  window.VPNP_AB = {
    bucketValue: bucketValue,
    inRollout: function (testKey, percent) {
      return bucketValue(testKey) < percent;
    },
    variant: function (testKey, variants) {
      var v = bucketValue(testKey);
      var cum = 0;
      for (var i = 0; i < variants.length; i++) {
        cum += variants[i].weight;
        if (v < cum) return variants[i].key;
      }
      return variants[variants.length - 1].key;
    }
  };
})();
