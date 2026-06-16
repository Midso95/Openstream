import { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, FlatList, StatusBar, ActivityIndicator, Alert
} from 'react-native';

const C = {
  bg: '#080808', surface: '#111111', surface2: '#1a1a1a',
  border: '#2a2a2a', accent: '#e50914',
  text: '#ffffff', text2: '#aaaaaa', text3: '#555555',
};

function parseM3U(txt) {
  const lines = txt.split('\n');
  const res = [];
  let cur = null;
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('#EXTINF')) {
      cur = { name: '', group: 'Général', logo: '', url: '' };
      const nm = l.match(/,(.+)$/);
      if (nm) cur.name = nm[1].trim();
      const gr = l.match(/group-title="([^"]*)"/i);
      if (gr) cur.group = gr[1] || 'Général';
    } else if (l && !l.startsWith('#') && cur) {
      cur.url = l; res.push(cur); cur = null;
    }
  }
  return res;
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [currentCh, setCurrentCh] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [directName, setDirectName] = useState('');
  const [xtream, setXtream] = useState({ host: '', user: '', pass: '' });

  const filtered = channels.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  async function loadUrl(url) {
    setLoading(true);
    setShowImport(false);
    setImportType(null);
    const httpsUrl = url.replace(/^http:\/\//i, 'https://');
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(httpsUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(httpsUrl)}`,
      httpsUrl,
      url,
    ];
    for (let i = 0; i < proxies.length; i++) {
      try {
        setLoadMsg(`Tentative ${i + 1}/${proxies.length}...`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const r = await fetch(proxies[i], { signal: controller.signal });
        clearTimeout(timeout);
        const txt = await r.text();
        if (txt.includes('#EXTM3U') || txt.includes('#EXTINF')) {
          const chs = parseM3U(txt);
          if (chs.length > 0) {
            setChannels(chs);
            setLoading(false);
            setScreen('live');
            return;
          }
        }
      } catch(e) { continue; }
    }
    setLoading(false);
    Alert.alert('Erreur', 'Impossible de charger la liste.\nVérifie ton lien ou tes identifiants.');
  }

  async function loadXtream() {
    const { host, user, pass } = xtream;
    if (!host || !user || !pass) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }
    const clean = host.replace(/\/$/, '');
    const url = `${clean}/get.php?username=${user}&password=${pass}&type=m3u_plus&output=ts`;
    await loadUrl(url);
  }

  function toggleFav(url) {
    setFavorites(f =>
      f.includes(url) ? f.filter(u => u !== url) : [...f, url]
    );
  }

  function playChannel(ch) {
    setCurrentCh(ch);
    setScreen('player');
  }

  // ── LOADING ──
  if (loading) return (
    <View style={[s.screen, s.center]}>
      <StatusBar barStyle="light-content" />
      <Text style={{ fontSize: 48, marginBottom: 24 }}>🔄</Text>
      <Text style={s.loadTitle}>
        <Text style={{ color: C.accent }}>Chargement</Text>{'\n'}en cours...
      </Text>
      <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 24 }} />
      <Text style={[s.text2, { marginTop: 16, textAlign: 'center' }]}>{loadMsg}</Text>
      <Text style={[s.text3, { marginTop: 8, textAlign: 'center' }]}>Essai de plusieurs connexions...</Text>
    </View>
  );

  // ── PLAYER ──
  if (screen === 'player') return (
    <View style={[s.screen, { backgroundColor: '#000' }]}>
      <StatusBar hidden />
      <View style={s.playerTop}>
        <TouchableOpacity onPress={() => setScreen('live')} style={s.backBtn}>
          <Text style={{ color: 'white', fontSize: 24 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={s.liveBadge}>
            <Text style={s.liveBadgeText}>🔴 DIRECT</Text>
          </View>
          <Text style={s.playerChName}>{currentCh?.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setScreen('live')} style={s.backBtn}>
          <Text style={{ color: 'white', fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.center, { flex: 1 }]}>
        <Text style={{ fontSize: 64 }}>📺</Text>
        <Text style={[s.text2, { marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }]}>
          En lecture{'\n'}
          <Text style={{ color: 'white', fontWeight: '700' }}>{currentCh?.name}</Text>
        </Text>
        <Text style={[s.text3, { marginTop: 8, fontSize: 10, textAlign: 'center', paddingHorizontal: 32 }]}>
          {currentCh?.url}
        </Text>
      </View>
      <View style={s.ctrlRow}>
        {['⏱ Vitesse', '🔒 Lock', '🎵 Audio', '📋 Guide', 'ℹ️ Infos'].map(b => (
          <TouchableOpacity key={b} style={s.ctrlBtn}>
            <Text style={s.ctrlBtnText}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── MAIN ──
  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <Text style={s.logo}>
          Open<Text style={{ color: C.accent }}>Stream</Text>
        </Text>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => { setShowImport(true); setImportType(null); }}
        >
          <Text style={{ fontSize: 18 }}>⬆️</Text>
        </TouchableOpacity>
      </View>

      {channels.length > 0 && (
        <View style={s.searchWrap}>
          <TextInput
            style={s.searchInput}
            placeholder="🔍  Rechercher une chaîne..."
            placeholderTextColor={C.text3}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {channels.length === 0 ? (
        <View style={[s.center, { flex: 1 }]}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>📡</Text>
          <Text style={s.emptyTitle}>Aucune chaîne</Text>
          <Text style={[s.text2, { marginBottom: 24, textAlign: 'center', paddingHorizontal: 40 }]}>
            Importe ta liste M3U pour commencer
          </Text>
          <TouchableOpacity
            style={s.importBtn}
            onPress={() => { setShowImport(true); setImportType(null); }}
          >
            <Text style={s.importBtnText}>Importer une liste</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.chItem} onPress={() => playChannel(item)}>
              <View style={s.chLogo}>
                <Text style={{ fontSize: 22 }}>📺</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.chName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.chGroup}>{item.group}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleFav(item.url)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 18 }}>
                  {favorites.includes(item.url) ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {showImport && (
        <View style={s.modalOverlay}>
          {!importType ? (
            <View style={s.actionSheet}>
              <View style={s.handle} />
              <Text style={[s.logo, { textAlign: 'center', marginBottom: 16 }]}>
                Ajouter une liste
              </Text>
              {[
                { icon: '🌐', label: 'M3U Playlist via URL', type: 'm3u' },
                { icon: '⚡', label: 'Xtream Codes', type: 'xtream' },
                { icon: '▶️', label: 'URL M3U8 directe', type: 'direct' },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={opt.type}
                  style={[s.actionItem, i < 2 && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }]}
                  onPress={() => setImportType(opt.type)}
                >
                  <Text style={s.actionText}>{opt.icon}  {opt.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[s.actionItem, { marginTop: 10, backgroundColor: '#1c1c1e', borderRadius: 14 }]}
                onPress={() => setShowImport(false)}
              >
                <Text style={[s.actionText, { color: C.accent, fontWeight: '700' }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.formSheet}>
              <View style={s.handle} />
              <TouchableOpacity
                onPress={() => setImportType(null)}
                style={{ paddingHorizontal: 20, paddingVertical: 8 }}
              >
                <Text style={s.accentText}>‹ Retour</Text>
              </TouchableOpacity>

              {importType === 'm3u' && (
                <View style={s.formBody}>
                  <Text style={s.formTitle}>🌐 M3U via URL</Text>
                  <Text style={s.text2}>Colle le lien de ta playlist M3U</Text>
                  <TextInput
                    style={[s.input, { marginTop: 12 }]}
                    placeholder="http://... ou https://..."
                    placeholderTextColor={C.text3}
                    value={urlInput}
                    onChangeText={setUrlInput}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <TouchableOpacity style={[s.btnLoad, { marginTop: 12 }]} onPress={() => loadUrl(urlInput)}>
                    <Text style={s.btnLoadText}>Charger la liste</Text>
                  </TouchableOpacity>
                </View>
              )}

              {importType === 'xtream' && (
                <View style={s.formBody}>
                  <Text style={s.formTitle}>⚡ Xtream Codes</Text>
                  <Text style={s.text2}>Identifiants fournis par ton opérateur</Text>
                  <TextInput
                    style={[s.input, { marginTop: 12 }]}
                    placeholder="URL serveur (http://host:port)"
                    placeholderTextColor={C.text3}
                    value={xtream.host}
                    onChangeText={v => setXtream(x => ({...x, host: v}))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Nom d'utilisateur"
                    placeholderTextColor={C.text3}
                    value={xtream.user}
                    onChangeText={v => setXtream(x => ({...x, user: v}))}
                    autoCapitalize="none"
                  />
                  <TextInput
                    style={s.input}
                    placeholder="Mot de passe"
                    placeholderTextColor={C.text3}
                    value={xtream.pass}
                    onChangeText={v => setXtream(x => ({...x, pass: v}))}
                    secureTextEntry
                  />
                  <TouchableOpacity style={[s.btnLoad, { marginTop: 4 }]} onPress={loadXtream}>
                    <Text style={s.btnLoadText}>Se connecter</Text>
                  </TouchableOpacity>
                </View>
              )}

              {importType === 'direct' && (
                <View style={s.formBody}>
                  <Text style={s.formTitle}>▶️ URL directe</Text>
                  <Text style={s.text2}>Lis un flux immédiatement</Text>
                  <TextInput
                    style={[s.input, { marginTop: 12 }]}
                    placeholder="Nom de la chaîne"
                    placeholderTextColor={C.text3}
                    value={directName}
                    onChangeText={setDirectName}
                  />
                  <TextInput
                    style={s.input}
                    placeholder="http://... .m3u8"
                    placeholderTextColor={C.text3}
                    value={urlInput}
                    onChangeText={setUrlInput}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  <TouchableOpacity
                    style={[s.btnLoad, { marginTop: 4 }]}
                    onPress={() => {
                      setShowImport(false);
                      playChannel({ name: directName || 'Flux direct', group: 'Direct', url: urlInput });
                    }}
                  >
                    <Text style={s.btnLoadText}>Lire maintenant</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 56 },
  logo: { fontSize: 22, fontWeight: '900', color: 'white' },
  iconBtn: { width: 40, height: 40, backgroundColor: C.surface, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchWrap: { marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { color: 'white', fontSize: 14 },
  chItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 6, backgroundColor: C.surface, borderRadius: 10 },
  chLogo: { width: 44, height: 44, backgroundColor: C.surface2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chName: { color: 'white', fontSize: 13, fontWeight: '600' },
  chGroup: { color: C.text3, fontSize: 11, marginTop: 2 },
  emptyTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  importBtn: { backgroundColor: C.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  importBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  actionSheet: { backgroundColor: '#1c1c1e', borderRadius: 20, margin: 12, padding: 8, paddingBottom: 24 },
  actionItem: { padding: 16, alignItems: 'center' },
  actionText: { color: 'white', fontSize: 16, fontWeight: '500' },
  formSheet: { backgroundColor: '#131313', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  formBody: { padding: 20, gap: 10 },
  formTitle: { color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  input: { backgroundColor: '#1e1e1e', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: 'white', fontSize: 14 },
  btnLoad: { backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnLoadText: { color: 'white', fontWeight: '700', fontSize: 15 },
  handle: { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  accentText: { color: C.accent, fontSize: 15, fontWeight: '600' },
  text2: { color: C.text2, fontSize: 13 },
  text3: { color: C.text3, fontSize: 12 },
  loadTitle: { color: 'white', fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  playerTop: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 10 },
  backBtn: { width: 36, height: 36, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  liveBadge: { backgroundColor: C.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  liveBadgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  playerChName: { color: 'white', fontSize: 13, fontWeight: '600', marginTop: 4 },
  ctrlRow: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8 },
  ctrlBtn: { alignItems: 'center', padding: 10 },
  ctrlBtnText: { color: C.text2, fontSize: 10 },
});
