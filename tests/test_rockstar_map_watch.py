"""Rockstar official-map watcher: parsing + one alert per file version (no network)."""
from src.agents.map import rockstar_map_watch as w

PAGE_BEFORE = '"vi_downloads_variant_name_map":"Leonida Map","vi_downloads_variant_name_map_printable":"Leonida Map - Printable"'
PAGE_AFTER = PAGE_BEFORE + (
    r'{\"variant\":\"cover_art\",\"src\":{\"src\":\"/x.jpg\"}},'
    r'{\"variant\":\"map_printable\",\"src\":\"$2c:thumb\",\"suffix\":\"(19.25 in x 26.33 in)\",'
    r'\"downloadUrl\":\"https://media-rockstargames-com.akamaized.net/VI/downloads/artwork_wallpapers/Leonida_Map_Poster_Printable.zip\"}')


class FakeTable:
    def __init__(self, db, name): self.db, self.name, self.filters = db, name, {}
    def select(self, *_): return self
    def eq(self, k, v): self.filters[k] = v; return self
    def limit(self, *_): return self
    def insert(self, row): self.db.setdefault(self.name, []).append(row); return self
    def execute(self):
        rows = [r for r in self.db.get(self.name, []) if all(r.get(k) == v for k, v in self.filters.items())]
        return type("R", (), {"data": rows})()


class FakeSB:
    def __init__(self): self.db = {}
    def table(self, n): return FakeTable(self.db, n)


HEAD = lambda url: {"status": 200, "bytes": 45419826, "last_modified": "Thu, 19 Nov 2026 13:47:51 GMT", "content_type": "application/zip"}


def test_translation_strings_alone_are_not_a_download():
    assert w.find_map_downloads(PAGE_BEFORE) == []


def test_finds_map_variant_download():
    f = w.find_map_downloads(PAGE_AFTER)
    assert f == [{"variant": "map_printable",
                  "url": "https://media-rockstargames-com.akamaized.net/VI/downloads/artwork_wallpapers/Leonida_Map_Poster_Printable.zip"}]


def test_alerts_once_per_file_version():
    sb = FakeSB()
    r1 = w.check(sb, get=lambda _: PAGE_AFTER, head=HEAD)
    r2 = w.check(sb, get=lambda _: PAGE_AFTER, head=HEAD)
    assert len(r1["alerted"]) == 1 and r2["alerted"] == []
    alerts = sb.db["map_alerts"]
    assert len(alerts) == 1 and alerts[0]["kind"] == "rockstar_map_download" and "map-source/" in alerts[0]["detail"]["how_to_apply"]
    # Rockstar re-uploads the file -> new Last-Modified -> alert again
    r3 = w.check(sb, get=lambda _: PAGE_AFTER, head=lambda u: {**HEAD(u), "last_modified": "Fri, 20 Nov 2026 09:00:00 GMT"})
    assert len(r3["alerted"]) == 1


def test_no_map_no_alert():
    sb = FakeSB()
    assert w.check(sb, get=lambda _: PAGE_BEFORE, head=HEAD)["alerted"] == []
    assert "map_alerts" not in sb.db
