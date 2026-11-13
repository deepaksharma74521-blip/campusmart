import urllib.request, json

shops = ['shop-1', 'shop-3', 'shop-4', 'shop-6', 'shop-7', 'shop-8', 'shop-9', 'shop-12', 'shop-14', 'shop-16', 'shop-17', 'shop-19', 'shop-20', 'shop-21', 'shop-22', 'shop-23']

print("=== ALL 16 SHOPS LIVE MENU STATUS ===")
for s in shops:
    res = urllib.request.urlopen(f'http://127.0.0.1:5000/api/menu?shopId={s}')
    data = json.loads(res.read())
    print(f"{s:8s} | Live Dishes: {data.get('count'):4d} | Source: {data.get('source')}")
