import { useState } from "react";

const theme = {
  bg: "#0f0e17", surface: "#1a1825", surfaceHigh: "#242136",
  border: "#2e2a45", accent: "#c9a84c", accentDim: "#7a6230",
  text: "#e8e6f0", textDim: "#8b87a0", success: "#27ae60",
  danger: "#c0392b", warning: "#e67e22", info: "#2980b9",
};

const screens = [
  "Login","Registrazione","Crea Personaggio","Lista Campagne","Crea Campagna",
  "Scheda Campagna","Approvazione PG","Missioni","Stanze","Chat Stanza","Chat Missione","Notifiche",
  "Profilo","Modifica Profilo","Gestione Personaggi","Scheda PG","Gestione Campagna",
  "Seleziona PG",
];

// ── COMPONENTI BASE ───────────────────────────────────────────────────

const Tag = ({ label, color = theme.accentDim }) => (
  <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:11,
    border:`1px solid ${color}`, color, background: color+"22", whiteSpace:"nowrap" }}>{label}</span>
);

const Avatar = ({ name, size=36, color=theme.accent }) => (
  <div style={{ width:size, height:size, borderRadius:"50%", background:color+"33",
    border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:size*0.4, color, fontWeight:700, flexShrink:0 }}>
    {name?.[0]?.toUpperCase()}
  </div>
);

const Btn = ({ children, onClick, variant="primary", small=false, disabled=false }) => {
  const styles = {
    primary: { background: theme.accent, color:"#0f0e17", border:"none" },
    secondary: { background:"transparent", color:theme.textDim, border:`1px solid ${theme.border}` },
    danger: { background:theme.danger+"22", color:theme.danger, border:`1px solid ${theme.danger}` },
    warning: { background:theme.warning+"22", color:theme.warning, border:`1px solid ${theme.warning}` },
    ghost: { background:"transparent", color:theme.accent, border:`1px solid ${theme.accent}` },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      ...styles[variant], padding: small ? "5px 12px" : "10px 18px",
      borderRadius:8, fontSize: small ? 12 : 14, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily:"inherit", opacity: disabled ? 0.4 : 1, whiteSpace:"nowrap",
    }}>{children}</button>
  );
};

const Card = ({ children, style={}, onClick }) => (
  <div onClick={onClick} style={{ background:theme.surface, border:`1px solid ${theme.border}`,
    borderRadius:10, padding:14, ...style, cursor: onClick ? "pointer" : style.cursor }}>
    {children}
  </div>
);

const Field = ({ label, value, placeholder }) => (
  <div style={{ marginBottom:12 }}>
    {label && <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>{label}</div>}
    <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6,
      padding:"9px 12px", color: value ? theme.text : theme.textDim, fontSize:13 }}>
      {value || placeholder}
    </div>
  </div>
);

const Toggle = ({ label, sub, active, onToggle }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"10px 0", borderBottom:`1px solid ${theme.border}` }}>
    <div>
      <div style={{ color:theme.text, fontSize:13, fontWeight:600 }}>{label}</div>
      {sub && <div style={{ color:theme.textDim, fontSize:11, marginTop:2 }}>{sub}</div>}
    </div>
    <div onClick={onToggle} style={{ width:42, height:24, borderRadius:12, cursor:"pointer",
      background: active ? theme.accent : theme.border, position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%", position:"absolute",
        top:3, left: active ? 21 : 3, transition:"left 0.2s" }} />
    </div>
  </div>
);

const BackHeader = ({ title, onBack, right }) => (
  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
    <span onClick={onBack} style={{ color:theme.accent, cursor:"pointer", fontSize:20, lineHeight:1 }}>←</span>
    <h2 style={{ color:theme.text, margin:0, fontSize:18, flex:1 }}>{title}</h2>
    {right}
  </div>
);

const Divider = () => <div style={{ borderBottom:`1px solid ${theme.border}`, margin:"12px 0" }} />;

// ── SCREENS ───────────────────────────────────────────────────────────

function LoginScreen({ nav }) {
  return (
    <div style={{ maxWidth:360, margin:"0 auto", paddingTop:60 }}>
      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>⚔️</div>
        <h1 style={{ color:theme.accent, fontSize:26, fontFamily:"Georgia,serif", margin:0 }}>Taverna del Codice</h1>
        <p style={{ color:theme.textDim, fontSize:13, marginTop:6 }}>Piattaforma GDR — Community App</p>
      </div>
      <Card>
        <Field label="USERNAME" placeholder="il_tuo_username" />
        <Field label="PASSWORD" placeholder="••••••••" />
        <div style={{ marginTop:8 }}><Btn onClick={() => nav("Lista Campagne")}>Entra nella Taverna</Btn></div>
        <div style={{ marginTop:14, textAlign:"center" }}>
          <span style={{ color:theme.textDim, fontSize:13 }}>Prima volta? </span>
          <span onClick={() => nav("Registrazione")} style={{ color:theme.accent, fontSize:13, cursor:"pointer" }}>Registrati →</span>
        </div>
      </Card>
      <p style={{ color:theme.textDim, fontSize:11, textAlign:"center", marginTop:20 }}>🔒 FIDO2 Hardware Auth — disponibile in futuro</p>
    </div>
  );
}

function RegisterScreen({ nav }) {
  return (
    <div style={{ maxWidth:380, margin:"0 auto", paddingTop:30 }}>
      <BackHeader title="Crea Account" onBack={() => nav("Login")} />
      <Card>
        <Field label="USERNAME *" placeholder="scegli un nome univoco" />
        <Field label="PASSWORD *" placeholder="••••••••" />
        <Field label="BIO" placeholder="Racconta chi sei..." />
        <div style={{ marginBottom:14 }}>
          <div style={{ color:theme.textDim, fontSize:12, marginBottom:4, fontFamily:"monospace" }}>AVATAR</div>
          <div style={{ border:`2px dashed ${theme.border}`, borderRadius:8, padding:20, textAlign:"center", color:theme.textDim, fontSize:13, cursor:"pointer" }}>
            📷 Carica immagine profilo<div style={{ fontSize:11, marginTop:4 }}>JPG, PNG — max 5MB</div>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <div style={{ color:theme.textDim, fontSize:12, marginBottom:8, fontFamily:"monospace" }}>CONTATTI (opzionale)</div>
          <Field placeholder="WhatsApp (es. +39...)" />
          <Field placeholder="Instagram / altro social (URL)" />
        </div>
        <Btn onClick={() => nav("Crea Personaggio")}>Crea Account →</Btn>
        <p style={{ color:theme.textDim, fontSize:11, marginTop:10, lineHeight:1.5 }}>
          Registrandoti accetti i Termini di Servizio. I messaggi chat vengono eliminati dopo max 72 ore.
        </p>
      </Card>
    </div>
  );
}

function CreateCharacterScreen({ nav }) {
  const [module, setModule] = useState("Generico");
  return (
    <div style={{ maxWidth:380, margin:"0 auto", paddingTop:20 }}>
      <BackHeader title="Nuovo Personaggio" onBack={() => nav("Lista Campagne")}
        right={<Tag label="NON ASSEGNATO" color={theme.textDim} />} />
      <div style={{ marginBottom:14 }}>
        <div style={{ color:theme.textDim, fontSize:12, marginBottom:8, fontFamily:"monospace" }}>PORTRAIT</div>
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:80, height:80, borderRadius:8, border:`2px dashed ${theme.border}`,
            display:"flex", alignItems:"center", justifyContent:"center", color:theme.textDim, fontSize:28, cursor:"pointer" }}>🎭</div>
          <div>
            <Btn small>Carica immagine</Btn>
            <div style={{ color:theme.textDim, fontSize:11, marginTop:4 }}>Salvato su CDN</div>
          </div>
        </div>
      </div>
      <Card style={{ marginBottom:12 }}>
        <Field label="NOME PERSONAGGIO *" value="Gandalf il Grigio" />
      </Card>
      <Card style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:12, marginBottom:6, fontFamily:"monospace" }}>BIOGRAFIA</div>
        <div style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6, padding:10,
          color:theme.text, fontSize:13, minHeight:80, lineHeight:1.6 }}>
          Stregone errante dalle origini misteriose. Ha percorso le terre per secoli...
        </div>
      </Card>
      <Card style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:12, marginBottom:6, fontFamily:"monospace" }}>DESCRIZIONE ESTETICA</div>
        <div style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6, padding:10,
          color:theme.textDim, fontSize:13, minHeight:60, lineHeight:1.6 }}>
          Barba lunga e bianca, cappello a punta, bastone nodoso...
        </div>
      </Card>
      <Card style={{ marginBottom:20 }}>
        <div style={{ color:theme.textDim, fontSize:12, marginBottom:8, fontFamily:"monospace" }}>MODULO DI GIOCO</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {["Generico","D&D 5e","Kill Team","Narrativo"].map(m => (
            <div key={m} onClick={() => setModule(m)} style={{ padding:"6px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: module===m ? theme.accent+"33" : "transparent",
              border:`1px solid ${module===m ? theme.accent : theme.border}`,
              color: module===m ? theme.accent : theme.textDim }}>{m}</div>
          ))}
        </div>
        <p style={{ color:theme.textDim, fontSize:11, marginTop:8 }}>Scheda specifica disponibile in futuro</p>
      </Card>
      <Btn onClick={() => nav("Lista Campagne")}>Salva Personaggio</Btn>
    </div>
  );
}

function CampaignListScreen({ nav }) {
  const [activeTag, setActiveTag] = useState("Tutti");
  const campaigns = [
    { name:"Il Drago di Pietra", tags:["dnd5e","hardcore"], members:8, status:"Aperta", isMember:true, isPrivate:false },
    { name:"Cronache Oscure", tags:["narrativo","casual"], members:5, status:"Aperta", isMember:true, isPrivate:false },
    { name:"Kill Team: Sigma-VII", tags:["kill-team","sci-fi"], members:12, status:"Piena", isMember:false, isPrivate:false },
    { name:"Ordine del Silenzio", tags:["horror","investigativo"], members:4, status:"Aperta", isMember:true, isPrivate:true },
  ];
  // Logica: mostra campagne pubbliche (is_searchable=true) + campagne di cui sei membro (sempre, anche se private)
  const visible = campaigns.filter(c => !c.isPrivate || c.isMember);
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ color:theme.text, margin:0 }}>Campagne</h2>
        <Btn small onClick={() => nav("Crea Campagna")}>+ Crea</Btn>
      </div>
      <div style={{ background:theme.surface, borderRadius:8, padding:8, marginBottom:14 }}>
        <div style={{ background:theme.bg, borderRadius:6, padding:"8px 10px", color:theme.textDim, fontSize:13 }}>🔍 Cerca campagne...</div>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {["Tutti","D&D 5e","Kill Team","Narrativo","Casual","Hardcore"].map(t => (
          <div key={t} onClick={() => setActiveTag(t)} style={{ padding:"4px 10px", borderRadius:20, fontSize:12, cursor:"pointer",
            background: activeTag===t ? theme.accent+"33" : "transparent",
            border:`1px solid ${activeTag===t ? theme.accent : theme.border}`,
            color: activeTag===t ? theme.accent : theme.textDim }}>{t}</div>
        ))}
      </div>
      <div style={{ background:theme.surfaceHigh, border:`1px dashed ${theme.accent}66`, borderRadius:8,
        padding:"10px 12px", color:theme.accent, fontSize:13, cursor:"pointer", marginBottom:16 }}>
        🔑 Hai un codice invito? Inseriscilo qui
      </div>
      {visible.map((c,i) => (
        <Card key={i} style={{ marginBottom:10 }} onClick={() => nav("Scheda Campagna")}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ color:theme.text, fontWeight:600 }}>{c.name}</span>
                {c.isPrivate && <span style={{ fontSize:11, padding:"1px 7px", borderRadius:20,
                  background:theme.textDim+"22", border:`1px solid ${theme.textDim}`,
                  color:theme.textDim }}>🔒 Privata</span>}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {c.tags.map(t => <Tag key={t} label={t} />)}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ color:c.status==="Aperta" ? theme.success : theme.warning, fontSize:12, marginBottom:4 }}>{c.status}</div>
              <div style={{ color:theme.textDim, fontSize:12 }}>👥 {c.members}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function CreaCampagnaScreen({ nav }) {
  const [selectedTags, setSelectedTags] = useState(["casual"]);
  const [modules, setModules] = useState({ stanze:true, missioni:true });
  const [gameModule, setGameModule] = useState("Generico");
  const [maxUsers, setMaxUsers] = useState(false);
  const tags = ["casual","hardcore","sci-fi","fantasy","horror","comico","romantico","investigativo","storico","post-apocalittico"];
  const toggleTag = t => setSelectedTags(p => p.includes(t) ? p.filter(x=>x!==t) : [...p,t]);
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20, paddingBottom:40 }}>
      <BackHeader title="Crea Campagna" onBack={() => nav("Lista Campagne")} />
      <Field label="NOME CAMPAGNA *" value="Il Drago di Pietra" />
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>DESCRIZIONE</div>
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6,
          padding:"9px 12px", color:theme.textDim, fontSize:13, minHeight:60 }}>
          Descrivi la campagna, l'ambientazione, lo stile di gioco...
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>MODULO DI GIOCO</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {["Generico","D&D 5e","Tabletop RPG","Kill Team","Narrativo Puro"].map(g => (
            <div key={g} onClick={() => setGameModule(g)} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: gameModule===g ? theme.accent+"22" : theme.surface,
              border:`1px solid ${gameModule===g ? theme.accent : theme.border}`,
              color: gameModule===g ? theme.accent : theme.textDim,
              fontWeight: gameModule===g ? 700 : 400 }}>{g}</div>
          ))}
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:4 }}>Default: Generico</div>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>TAG TEMATICHE <span style={{ fontWeight:400 }}>(opzionale)</span></div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
          {tags.map(t => (
            <div key={t} onClick={() => toggleTag(t)} style={{ padding:"4px 10px", borderRadius:20, fontSize:12, cursor:"pointer",
              background: selectedTags.includes(t) ? theme.accent+"22" : theme.surface,
              border:`1px solid ${selectedTags.includes(t) ? theme.accent : theme.border}`,
              color: selectedTags.includes(t) ? theme.accent : theme.textDim }}>#{t}</div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>NUMERO MASSIMO UTENTI</div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"9px 12px", color: maxUsers ? theme.text : theme.textDim, fontSize:13 }}>
            {maxUsers ? "20" : "∞  Nessun limite"}
          </div>
          <div onClick={() => setMaxUsers(!maxUsers)} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6,
            padding:"9px 14px", color:theme.accent, fontSize:13, cursor:"pointer" }}>
            {maxUsers ? "Rimuovi" : "Imposta"}
          </div>
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:3 }}>Default: illimitato</div>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:8, fontFamily:"monospace" }}>MODULI ATTIVI</div>
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:"0 14px" }}>
          <Toggle label="🏠 Stanze" sub="Chat contestuali (Mercato, Piazza, Prigione...)"
            active={modules.stanze} onToggle={() => setModules(p => ({...p, stanze:!p.stanze}))} />
          <Toggle label="⚔️ Missioni" sub="Gestione sessioni, iscrizioni, chat missione"
            active={modules.missioni} onToggle={() => setModules(p => ({...p, missioni:!p.missioni}))} />
          <div style={{ padding:"10px 0", borderBottom:`1px solid ${theme.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:theme.textDim, fontSize:13, fontWeight:600 }}>🎲 Schede Personaggio</div>
                <div style={{ color:theme.textDim, fontSize:11 }}>Schede strutturate per modulo di gioco</div>
              </div>
              <Tag label="PROSSIMAMENTE" color={theme.textDim} />
            </div>
          </div>
          <div style={{ padding:"10px 0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:theme.textDim, fontSize:13, fontWeight:600 }}>🗺️ Mappe</div>
                <div style={{ color:theme.textDim, fontSize:11 }}>Mappe interattive della campagna</div>
              </div>
              <Tag label="PROSSIMAMENTE" color={theme.textDim} />
            </div>
          </div>
        </div>
        {!modules.stanze && !modules.missioni && (
          <div style={{ marginTop:8, color:theme.warning, fontSize:12 }}>⚠️ Nessun modulo attivo — la campagna avrà solo profilo e roster</div>
        )}
      </div>
      <div style={{ marginBottom:20 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:8, fontFamily:"monospace" }}>VISIBILITÀ</div>
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:"0 14px" }}>
          <Toggle label="🔍 Ricercabile" sub="Appare nei risultati di ricerca pubblica" active={true} onToggle={() => {}} />
          <Toggle label="🚪 Aperta" sub="Accetta nuove richieste di accesso" active={true} onToggle={() => {}} />
        </div>
      </div>
      <Btn onClick={() => nav("Scheda Campagna")}>⚔️ Crea Campagna</Btn>
      <p style={{ color:theme.textDim, fontSize:11, marginTop:10, textAlign:"center" }}>
        Diventerai automaticamente SUPER_MASTER. Potrai invitare master e giocatori subito dopo.
      </p>
    </div>
  );
}

function CampaignDetailScreen({ nav }) {
  const [myRole] = useState("SUPER_MASTER"); // Simula ruolo corrente
  const [hasPG] = useState(false); // Simula: true se hai già un PG attivo qui
  const canManage = myRole === "SUPER_MASTER" || myRole === "MASTER";
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
        <span onClick={() => nav("Lista Campagne")} style={{ color:theme.accent, cursor:"pointer", fontSize:20 }}>←</span>
        <h2 style={{ color:theme.text, margin:0, fontSize:18, flex:1 }}>Il Drago di Pietra</h2>
        <button onClick={() => canManage && nav("Gestione Campagna")} style={{
          padding:"5px 12px", borderRadius:8, fontSize:12, fontFamily:"inherit", fontWeight:600,
          background: canManage ? theme.accent+"22" : theme.surfaceHigh,
          border:`1px solid ${canManage ? theme.accent : theme.border}`,
          color: canManage ? theme.accent : theme.textDim,
          cursor: canManage ? "pointer" : "not-allowed", opacity: canManage ? 1 : 0.5
        }}>✏️ Modifica</button>
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:14 }}>
        <Tag label="dnd5e" /><Tag label="hardcore" /><Tag label="aperta" color={theme.success} />
        <Tag label={myRole} color={myRole==="SUPER_MASTER" ? theme.accent : myRole==="MASTER" ? theme.danger : "#9b59b6"} />
      </div>
      <Card style={{ marginBottom:12 }}>
        <p style={{ color:theme.textDim, fontSize:13, margin:0, lineHeight:1.6 }}>
          Una campagna epica ambientata nei Regni Dimenticati. Solo per giocatori esperti.
        </p>
      </Card>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        {[["👥 Membri","8 attivi"],["⚔️ Missioni","3 aperte"],["💬 Stanze","4 attive"],["🎲 Modulo","D&D 5e"]].map(([k,v]) => (
          <Card key={k} style={{ textAlign:"center", padding:12 }}>
            <div style={{ color:theme.text, fontWeight:600, fontSize:13 }}>{k}</div>
            <div style={{ color:theme.accent, fontSize:13, marginTop:4 }}>{v}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginBottom:14 }}>
        <div style={{ color:theme.textDim, fontSize:12, marginBottom:10, fontFamily:"monospace" }}>MASTER</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Avatar name="Gino" color={theme.accent} size={40} />
          <div><div style={{ color:theme.text, fontWeight:600 }}>Gino_Mastro</div><Tag label="SUPER_MASTER" color={theme.accent} /></div>
        </div>
      </Card>
      {/* Bottone PG — sempre visibile per tutti i ruoli */}
      <div style={{ marginTop:16 }}>
        <button
          onClick={() => !hasPG && nav("Seleziona PG")}
          style={{ width:"100%", padding:"11px", borderRadius:8, fontSize:14, fontWeight:600,
            fontFamily:"inherit", cursor: hasPG ? "not-allowed" : "pointer",
            background: hasPG ? theme.surfaceHigh : theme.accent+"22",
            border:`1px solid ${hasPG ? theme.border : theme.accent}`,
            color: hasPG ? theme.textDim : theme.accent,
            opacity: hasPG ? 0.6 : 1 }}>
          {hasPG ? "🧙 Hai già un PG attivo in questa campagna" : "🧙 Aggiungi il mio PG a questa campagna"}
        </button>
        {!hasPG && <p style={{ color:theme.textDim, fontSize:11, marginTop:6, textAlign:"center" }}>Scegli il personaggio con cui vuoi partecipare</p>}
        {hasPG && <p style={{ color:theme.textDim, fontSize:11, marginTop:6, textAlign:"center" }}>Puoi avere un solo PG attivo per campagna. Ritira il PG corrente per cambiarlo.</p>}
      </div>
    </div>
  );
}

function ApprovalScreen({ nav }) {
  const [requests, setRequests] = useState([
    { user:"Mario_R", pg:"Legolas", bio:"Elfo arciere delle Foreste del Nord, custode di antichi segreti silvani.", status:"PENDING" },
    { user:"Sara_86", pg:"Brienne", bio:"Cavaliera d'onore, fedele agli ideali di giustizia e protezione dei deboli.", status:"PENDING" },
  ]);
  const handle = (i, action) => setRequests(p => p.map((r,idx) => idx===i ? {...r, status:action} : r));
  const pending = requests.filter(r=>r.status==="PENDING").length;
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <BackHeader title="Richieste di Accesso" onBack={() => nav("Lista Campagne")}
        right={pending > 0 ? <div style={{ background:theme.danger, color:"#fff", borderRadius:"50%",
          width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{pending}</div> : null} />
      {requests.map((r,i) => (
        <Card key={i} style={{ marginBottom:14, opacity: r.status!=="PENDING" ? 0.6 : 1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <Avatar name={r.user} size={40} />
            <div>
              <div style={{ color:theme.text, fontWeight:600 }}>{r.user}</div>
              <div style={{ color:theme.textDim, fontSize:12 }}>Vuole entrare con:</div>
            </div>
            <div style={{ marginLeft:"auto" }}>
              <Tag label={r.status} color={r.status==="PENDING" ? theme.info : r.status==="APPROVED" ? theme.success : theme.danger} />
            </div>
          </div>
          <div style={{ background:theme.bg, borderRadius:8, padding:10, marginBottom:10, borderLeft:`3px solid ${theme.accent}` }}>
            <div style={{ color:theme.accent, fontWeight:600, marginBottom:6 }}>{r.pg} <span style={{ color:theme.textDim, fontWeight:400, fontSize:12 }}>— Personaggio</span></div>
            <div style={{ color:theme.textDim, fontSize:13, lineHeight:1.5 }}>{r.bio}</div>
          </div>
          <div style={{ background:theme.surfaceHigh, borderRadius:6, padding:"8px 10px", marginBottom:12, fontSize:12, color:theme.textDim }}>
            📅 Membro dal 2023 • ⚔️ 3 campagne giocate
          </div>
          {r.status==="PENDING" && (
            <div style={{ display:"flex", gap:8 }}>
              <Btn onClick={() => handle(i,"APPROVED")}>✓ Approva</Btn>
              <Btn variant="danger" onClick={() => handle(i,"REJECTED")}>✗ Rifiuta</Btn>
            </div>
          )}
          {r.status==="APPROVED" && <div style={{ color:theme.success, fontSize:13 }}>✓ Approvato — notifica push inviata</div>}
          {r.status==="REJECTED" && <div style={{ color:theme.danger, fontSize:13 }}>✗ Rifiutato — notifica push inviata</div>}
        </Card>
      ))}
    </div>
  );
}

function MissionsScreen({ nav }) {
  const [view, setView] = useState("list");
  const [selected, setSelected] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [multiSession, setMultiSession] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [scheduledOpen, setScheduledOpen] = useState(false);
  const [approvals, setApprovals] = useState({});

  const missions = [
    { id:0, title:"La Cripta Perduta", campagna:"Il Drago di Pietra", status:"OPEN", titolari:2, min:3, max:5, levelMin:1, levelMax:4, session:"21/12/2024", sessionH:"21:00", multi:false, isCreator:true, myParticipation:null,
      desc:"Un dungeon abbandonato nasconde segreti oscuri. Servono eroi coraggiosi per esplorarne le profondità.", iscritti:["Gandalf (Mario_R)","Legolas (Sara_86)"] },
    { id:1, title:"Il Mercante Misterioso", campagna:"Cronache Oscure", status:"CONFIRMED", titolari:4, min:3, max:4, levelMin:null, levelMax:null, session:"20/12/2024", sessionH:"21:30", multi:true, isCreator:false, myParticipation:"TITOLARE",
      desc:"Un mercante dall'identità ignota vuole trattare con il gruppo. Cosa avrà da offrire?", iscritti:["Gandalf (Mario_R)","Legolas (Sara_86)","Aragorn (Luca_X)","Gimli (Paolo_K)"] },
    { id:2, title:"Pattuglia Notturna", campagna:"Il Drago di Pietra", status:"REOPENED", titolari:2, min:2, max:3, levelMin:3, levelMax:null, session:"18/12/2024", sessionH:"21:00", multi:false, isCreator:true, myParticipation:"NON_TITOLARE",
      desc:"Presenze oscure nei boschi a nord. Il villaggio chiede protezione per la notte.", iscritti:["Aragorn (Luca_X)","Gimli (Paolo_K)"] },
  ];
  const statusColor = s => s==="CONFIRMED" ? theme.success : s==="REOPENED" ? theme.warning : s==="CANCELLED" ? theme.danger : theme.info;

  // CREA
  if (view==="create") return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20, paddingBottom:40 }}>
      <BackHeader title="Nuova Missione" onBack={() => setView("list")} />
      <Field label="TITOLO *" value="La Cripta Perduta" />
      <div style={{ marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ color:theme.textDim, fontSize:11, fontFamily:"monospace" }}>DESCRIZIONE / IMMAGINE</div>
          <div style={{ display:"flex", gap:6 }}>
            {["Testo","Immagine"].map(t => (
              <div key={t} onClick={() => setHasImage(t==="Immagine")} style={{ padding:"2px 10px", borderRadius:20, fontSize:11, cursor:"pointer",
                background: (hasImage===false && t==="Testo") || (hasImage && t==="Immagine") ? theme.accent+"22" : "transparent",
                border:`1px solid ${(hasImage===false && t==="Testo") || (hasImage && t==="Immagine") ? theme.accent : theme.border}`,
                color: (hasImage===false && t==="Testo") || (hasImage && t==="Immagine") ? theme.accent : theme.textDim }}>{t}</div>
            ))}
          </div>
        </div>
        {!hasImage ? (
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"9px 12px", color:theme.textDim, fontSize:13, minHeight:70 }}>
            Descrivi la missione, l'ambientazione, gli obiettivi...
          </div>
        ) : (
          <div style={{ background:theme.surface, border:`2px dashed ${theme.accent}`, borderRadius:6, padding:"20px 12px", textAlign:"center", cursor:"pointer" }}>
            <div style={{ fontSize:28, marginBottom:6 }}>🖼️</div>
            <div style={{ color:theme.accent, fontSize:13, fontWeight:600 }}>Carica immagine</div>
            <div style={{ color:theme.textDim, fontSize:11, marginTop:4 }}>JPG, PNG — max 5MB • sostituisce il testo</div>
          </div>
        )}
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>DATA SESSIONE *</div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 2fr 1.2fr", gap:6 }}>
          {[["GIORNO","21"],["MESE","12"],["ANNO","2024"],["ORA H24","21:00"]].map(([l,v]) => (
            <div key={l}>
              <div style={{ color:theme.textDim, fontSize:9, marginBottom:3, fontFamily:"monospace" }}>{l}</div>
              <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"7px 8px", color:theme.text, fontSize:13, textAlign:"center" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:4 }}>→ Sabato 21 Dicembre 2024 ore 21:00</div>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>LIVELLO <span style={{ fontWeight:400 }}>(informativo, opzionale)</span></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["LIV. MINIMO","1"],["LIV. MASSIMO","4"]].map(([l,v]) => (
            <div key={l}>
              <div style={{ color:theme.textDim, fontSize:10, marginBottom:3, fontFamily:"monospace" }}>{l}</div>
              <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"8px 12px", color:theme.text, fontSize:13 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:3 }}>Solo display — nessuna logica di blocco</div>
      </div>
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>GIOCATORI</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          {[["MIN *","3"],["MAX *","5"]].map(([l,v]) => (
            <div key={l}>
              <div style={{ color:theme.textDim, fontSize:10, marginBottom:3, fontFamily:"monospace" }}>{l}</div>
              <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"8px 12px", color:theme.text, fontSize:13 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:3 }}>Chiude al MAX o 24h prima della sessione</div>
      </div>
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:12, marginBottom:12 }}>
        <Toggle label="Apertura Programmata" sub="Visibile solo a Master fino all'orario scelto" active={scheduledOpen} onToggle={() => setScheduledOpen(!scheduledOpen)} />
        {scheduledOpen && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${theme.border}` }}>
            <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>APERTURA ISCRIZIONI</div>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 2fr 1.2fr", gap:6 }}>
              {[["GIORNO","18"],["MESE","12"],["ANNO","2024"],["ORA H24","20:00"]].map(([l,v]) => (
                <div key={l}>
                  <div style={{ color:theme.textDim, fontSize:9, marginBottom:3, fontFamily:"monospace" }}>{l}</div>
                  <div style={{ background:theme.surfaceHigh, border:`1px solid ${theme.accent}`, borderRadius:6, padding:"7px 8px", color:theme.text, fontSize:13, textAlign:"center" }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ color:theme.accent, fontSize:11, marginTop:6 }}>→ Martedì 18 Dicembre 2024 ore 20:00</div>
            <div style={{ color:theme.textDim, fontSize:10, marginTop:3 }}>Push ai giocatori e co-master all'apertura automatica</div>
          </div>
        )}
      </div>
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:12, marginBottom:20 }}>
        <Toggle label="Multi Sessione" sub="Chat missione non viene eliminata dopo 3gg" active={multiSession} onToggle={() => setMultiSession(!multiSession)} />
      </div>
      <Btn onClick={() => setView("list")}>⚔️ Crea Missione + Notifica Push</Btn>
      <p style={{ color:theme.textDim, fontSize:11, marginTop:8, textAlign:"center" }}>Push inviata a tutti i membri notificabili</p>
    </div>
  );

  // DETTAGLIO
  if (view==="detail" && selected!==null) {
    const m = missions[selected];
    const myStatus = approvals[m.id];
    return (
      <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20, paddingBottom:40 }}>
        {showCancelModal && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"#000000cc",
            display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
            <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:20, width:"100%", maxWidth:340 }}>
              <div style={{ color:theme.text, fontWeight:700, fontSize:15, marginBottom:6 }}>⚠️ Annulla Missione</div>
              <div style={{ color:theme.textDim, fontSize:12, marginBottom:12 }}>
                Il messaggio sarà inviato via push a tutti gli iscritti, anche senza quorum raggiunto.
              </div>
              <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>MOTIVO</div>
              <div style={{ background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6, padding:"8px 12px",
                color:theme.text, fontSize:13, marginBottom:16, minHeight:60, lineHeight:1.6 }}>
                La sessione è annullata per impegni improvvisi. Ci vediamo la prossima settimana!
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn variant="secondary" onClick={() => setShowCancelModal(false)}>← Indietro</Btn>
                <Btn variant="warning" onClick={() => setShowCancelModal(false)}>Conferma + Push</Btn>
              </div>
            </div>
          </div>
        )}
        <BackHeader title={m.title} onBack={() => setView("list")}
          right={<Tag label={m.status} color={statusColor(m.status)} />} />
        <Card style={{ marginBottom:12 }}>
          <div style={{ color:theme.textDim, fontSize:13, lineHeight:1.6 }}>{m.desc}</div>
        </Card>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
          {[["📅 Sessione",`${m.session} ${m.sessionH}`],
            ["⚔️ Livello", m.levelMin ? `Liv ${m.levelMin}${m.levelMax?`–${m.levelMax}`:"+"}`:"Qualsiasi"],
            ["👥 Giocatori",`${m.titolari}/${m.max} (min ${m.min})`],
            ["⏰ Iscrizioni", m.closes||"Auto 24h prima"]].map(([k,v]) => (
            <div key={k} style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"8px 10px" }}>
              <div style={{ color:theme.textDim, fontSize:11 }}>{k}</div>
              <div style={{ color:theme.text, fontSize:13, fontWeight:600, marginTop:2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ background:theme.border, borderRadius:4, height:6, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:4, background: m.titolari>=m.max ? theme.success : theme.accent,
              width:`${Math.min((m.titolari/m.max)*100,100)}%` }} />
          </div>
          <div style={{ color:theme.textDim, fontSize:11, marginTop:3 }}>{m.titolari}/{m.max} titolari • minimo: {m.min}</div>
        </div>
        {m.multi && <div style={{ marginBottom:12 }}><Tag label="🔄 MULTI SESSIONE" color={theme.accent} /></div>}
        <div style={{ marginBottom:14 }}>
          <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>ISCRITTI</div>
          {m.iscritti.map((p,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:`1px solid ${theme.border}` }}>
              <Avatar name={p[0]} size={26} color={[theme.info,theme.danger,theme.success,theme.accent][i%4]} />
              <span style={{ color:theme.text, fontSize:13, flex:1 }}>{p}</span>
              <Tag label="TITOLARE" color={theme.success} />
            </div>
          ))}
        </div>
        {/* Azioni GIOCATORE */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
          {!myStatus && (m.status==="OPEN"||m.status==="REOPENED") && (
            <><Btn onClick={() => setApprovals(p=>({...p,[m.id]:"titolare"}))}>⚔️ Iscriviti Titolare</Btn>
              <Btn variant="secondary" onClick={() => setApprovals(p=>({...p,[m.id]:"riserva"}))}>👁 Riserva</Btn></>
          )}
          {myStatus==="titolare" && <div style={{ color:theme.success, fontSize:13, padding:"8px 0" }}>✓ Iscritto come titolare — <span style={{ color:theme.danger, cursor:"pointer" }} onClick={() => setApprovals(p=>({...p,[m.id]:null}))}>Ritirati</span></div>}
          {myStatus==="riserva" && <div style={{ color:theme.info, fontSize:13, padding:"8px 0" }}>👁 Iscritto come riserva — <span style={{ color:theme.danger, cursor:"pointer" }} onClick={() => setApprovals(p=>({...p,[m.id]:null}))}>Ritirati</span></div>}
          {(m.status==="CONFIRMED"||m.status==="CLOSED") && myStatus && (
            <div style={{ marginLeft:"auto" }}><Btn small variant="secondary" onClick={() => nav("Chat Missione")}>💬 Chat</Btn></div>
          )}
        </div>
        {/* Azioni MASTER solo creatore */}
        {m.isCreator && (
          <div style={{ borderTop:`1px solid ${theme.border}`, paddingTop:14 }}>
            <div style={{ color:theme.textDim, fontSize:11, marginBottom:10, fontFamily:"monospace" }}>
              GESTIONE <span style={{ color:theme.accent }}>(solo creatore)</span>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn small variant="secondary">✏️ Modifica</Btn>
              <Btn small variant="secondary">🔓 Riapri</Btn>
              <Btn small variant="warning" onClick={() => setShowCancelModal(true)}>⚠️ Annulla</Btn>
              <Btn small variant="danger">🗑️ Elimina DB</Btn>
            </div>
            <div style={{ marginTop:8, color:theme.textDim, fontSize:11, lineHeight:1.6 }}>
              <span style={{ color:theme.warning }}>Annulla</span> → status CANCELLED + push con motivo, rimane nel DB<br/>
              <span style={{ color:theme.danger }}>Elimina</span> → rimozione permanente DB + immagini R2
            </div>
          </div>
        )}
      </div>
    );
  }

  // LISTA
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ color:theme.text, margin:0 }}>Missioni</h2>
        <Btn small onClick={() => setView("create")}>+ Nuova</Btn>
      </div>
      {missions.map((m,i) => (
        <Card key={i} style={{ marginBottom:12 }} onClick={() => { setSelected(i); setView("detail"); }}>
          {/* Header: titolo + status */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:2 }}>
            <div style={{ color:theme.text, fontWeight:600, fontSize:14 }}>{m.title}</div>
            <Tag label={m.status} color={statusColor(m.status)} />
          </div>
          {/* Campagna di appartenenza */}
          <div style={{ color:theme.accent, fontSize:11, marginBottom:8 }}>📍 {m.campagna}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:8 }}>
            <div style={{ color:theme.textDim, fontSize:12 }}>📅 {m.session} {m.sessionH}</div>
            <div style={{ color:theme.textDim, fontSize:12 }}>⚔️ {m.levelMin ? `Liv ${m.levelMin}${m.levelMax?`–${m.levelMax}`:"+"}`:"Qualsiasi"}</div>
            <div style={{ color:theme.textDim, fontSize:12 }}>👥 {m.titolari}/{m.max} (min {m.min})</div>
            {m.multi && <Tag label="MULTI SESSIONE" color={theme.accent} />}
          </div>
          <div style={{ background:theme.border, borderRadius:4, height:4, overflow:"hidden", marginBottom:8 }}>
            <div style={{ height:"100%", borderRadius:4, background: m.titolari>=m.max ? theme.success : theme.accent,
              width:`${Math.min((m.titolari/m.max)*100,100)}%` }} />
          </div>
          {/* Footer: partecipazione + chat (solo se CONFIRMED/CLOSED e iscritto) */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ color:theme.textDim, fontSize:11 }}>{m.titolari}/{m.max} titolari</div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              {m.myParticipation && (
                <Tag label={m.myParticipation} color={m.myParticipation==="TITOLARE" ? theme.success : theme.info} />
              )}
              {(m.status==="CONFIRMED" || m.status==="CLOSED") && m.myParticipation && (
                <div onClick={e => { e.stopPropagation(); nav("Chat Missione"); }} style={{
                  padding:"3px 10px", borderRadius:20, fontSize:11, cursor:"pointer",
                  background:theme.info+"22", border:`1px solid ${theme.info}`, color:theme.info
                }}>💬 Chat</div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function StanzeScreen({ nav }) {
  const rooms = [
    { name:"Piazza Centrale", type:"ROLEPLAY", unread:3, ttl:"48h", active:true },
    { name:"Mercato di Piedimonte", type:"ROLEPLAY", unread:0, ttl:"72h", active:true },
    { name:"Locanda del Drago", type:"SPAM", unread:12, ttl:"24h", active:true },
    { name:"Prigioni del Castello", type:"ROLEPLAY", unread:0, ttl:"72h", active:false },
  ];
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <h2 style={{ color:theme.text, margin:0 }}>Stanze</h2>
        <Btn small>+ Nuova Stanza</Btn>
      </div>
      <p style={{ color:theme.textDim, fontSize:12, marginBottom:16 }}>Il Drago di Pietra • modulo STANZE attivo</p>
      {rooms.map((r,i) => (
        <div key={i} onClick={() => r.active && nav("Chat Stanza")} style={{ display:"flex", alignItems:"center", gap:12,
          padding:"12px 14px", background:theme.surface, border:`1px solid ${r.active ? theme.border : theme.border+"44"}`,
          borderRadius:8, marginBottom:8, cursor: r.active ? "pointer" : "default", opacity: r.active ? 1 : 0.45 }}>
          <div style={{ fontSize:24 }}>{r.type==="ROLEPLAY" ? "🎭" : "💬"}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
              <span style={{ color:theme.text, fontWeight:600, fontSize:14 }}>{r.name}</span>
              {!r.active && <Tag label="INATTIVA" color={theme.textDim} />}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <Tag label={r.type} color={r.type==="ROLEPLAY" ? theme.accent : theme.info} />
              <span style={{ color:theme.textDim, fontSize:11 }}>TTL {r.ttl}</span>
            </div>
          </div>
          {r.unread > 0 && (
            <div style={{ background:theme.danger, color:"#fff", borderRadius:"50%", width:22, height:22,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{r.unread}</div>
          )}
        </div>
      ))}
      <div style={{ marginTop:16, background:theme.surfaceHigh, border:`1px dashed ${theme.border}`, borderRadius:8, padding:12 }}>
        <div style={{ color:theme.textDim, fontSize:12, marginBottom:6 }}>Moduli campagna attivi:</div>
        <div style={{ display:"flex", gap:8 }}>
          <Tag label="✓ STANZE" color={theme.success} />
          <Tag label="✓ MISSIONI" color={theme.success} />
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:6 }}>
          Se il modulo STANZE fosse disattivo, questa lista non sarebbe visibile e il bottone "Nuova Stanza" sarebbe disabilitato.
          La chat missione resta accessibile dal modulo MISSIONI.
        </div>
      </div>
    </div>
  );
}

function RoleplayChatScreen({ nav }) {
  const [msgType, setMsgType] = useState("Dialogo");
  const messages = [
    { char:"Gandalf", type:"ACTION", content:"Si avvicina lentamente alla porta, bastone alla mano.", color:"#9b59b6" },
    { char:"Legolas", type:"DIALOG", content:`"Sento qualcosa muoversi nell'ombra. Non mi piace."`, color:"#27ae60" },
    { char:"Voce Narrante", type:"SYSTEM", content:"Il Master richiede un tiro su Percezione da Legolas.", color:theme.info, isSystem:true },
    { char:"Legolas", type:"DICE_ROLL", content:"🎲 Tiro Percezione: 17 (d20)", color:"#27ae60", dice:true },
    { char:"Voce Narrante", type:"ACTION", content:"Dalle ombre emerge una figura incappucciata. Occhi rosso sangue.", color:theme.danger, isNpc:true },
  ];
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:10, display:"flex", flexDirection:"column", height:"calc(100vh - 140px)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span onClick={() => nav("Stanze")} style={{ color:theme.accent, cursor:"pointer", fontSize:18 }}>←</span>
          <div>
            <div style={{ color:theme.text, fontWeight:600 }}>Piazza Centrale</div>
            <div style={{ color:theme.textDim, fontSize:11 }}>Il Drago di Pietra • ROLEPLAY • TTL 48h</div>
          </div>
        </div>
        <Tag label="ROLEPLAY" color={theme.accent} />
      </div>
      <div style={{ flex:1, overflowY:"auto", marginBottom:10 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ marginBottom:10, display:"flex", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, marginTop:2,
              background: m.isSystem ? theme.surfaceHigh : m.color+"33",
              border:`1px solid ${m.isSystem ? theme.border : m.color}`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:m.color }}>
              {m.char[0]}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                <span style={{ color: m.isNpc ? theme.danger : m.isSystem ? theme.info : m.color, fontSize:12, fontWeight:700 }}>{m.char}</span>
                {m.isNpc && <Tag label="NPC" color={theme.danger} />}
                <span style={{ color:theme.textDim, fontSize:10 }}>{m.type}</span>
              </div>
              <div style={{ color: m.type==="ACTION" ? theme.textDim : m.type==="SYSTEM" ? theme.info : theme.text,
                fontSize:13, lineHeight:1.6, fontStyle: m.type==="ACTION" ? "italic" : "normal",
                background: m.dice ? theme.accent+"11" : "transparent",
                padding: m.dice ? "4px 8px" : 0, borderRadius: m.dice ? 6 : 0,
                borderLeft: m.dice ? `2px solid ${theme.accent}` : "none" }}>{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:10, padding:10 }}>
        <div style={{ display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" }}>
          {["💬 Dialogo","⚡ Azione","👁 OOC","🎲 Tiro"].map(t => (
            <div key={t} onClick={() => setMsgType(t.split(" ")[1])} style={{ padding:"3px 8px", borderRadius:20, fontSize:11, cursor:"pointer",
              background: msgType===t.split(" ")[1] ? theme.accent+"22" : "transparent",
              border:`1px solid ${msgType===t.split(" ")[1] ? theme.accent : theme.border}`,
              color: msgType===t.split(" ")[1] ? theme.accent : theme.textDim }}>{t}</div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6,
            padding:"8px 10px", color:theme.textDim, fontSize:13 }}>Parla come Gandalf...</div>
          <Btn small>Invia</Btn>
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:6 }}>🎭 Stai interpretando: <span style={{ color:"#9b59b6" }}>Gandalf il Grigio</span></div>
      </div>
    </div>
  );
}

function MissionChatScreen({ nav }) {
  const messages = [
    { user:"Mario_R", content:"Siete pronti per sabato? Ricordo livello 1-4.", time:"10:12", color:"#3498db" },
    { user:"Sara_86", content:"Ci sono! Porto l'elenco degli incantesimi.", time:"10:15", color:"#e74c3c" },
    { user:"Gino_M", content:"Iniziamo alle 21 precise, ho solo 3 ore.", time:"10:20", color:theme.accent },
    { user:"Luca_X", content:"Ok perfetto, a sabato! ⚔️", time:"10:45", color:"#9b59b6" },
  ];
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:10, display:"flex", flexDirection:"column", height:"calc(100vh - 140px)" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span onClick={() => nav("Missioni")} style={{ color:theme.accent, cursor:"pointer", fontSize:18 }}>←</span>
          <div>
            <div style={{ color:theme.text, fontWeight:600 }}>Chat Missione</div>
            <div style={{ color:theme.textDim, fontSize:11 }}>La Cripta Perduta • TTL 3gg • solo iscritti</div>
          </div>
        </div>
        <Tag label="MISSIONE" color={theme.warning} />
      </div>
      <div style={{ background:theme.surfaceHigh, borderRadius:6, padding:"6px 10px", marginBottom:10, fontSize:12 }}>
        <span style={{ color:theme.textDim }}>👥 </span>
        <span style={{ color:theme.text }}>Mario_R, Sara_86, Gino_M, Luca_X</span>
        <span style={{ color:theme.textDim }}> • </span>
        <span style={{ color:theme.accent }}>Sab 21 Dic 21:00</span>
      </div>
      <div style={{ flex:1, overflowY:"auto", marginBottom:10 }}>
        {messages.map((m,i) => (
          <div key={i} style={{ marginBottom:8, display:"flex", gap:8, alignItems:"flex-start" }}>
            <Avatar name={m.user} size={28} color={m.color} />
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:6, alignItems:"baseline" }}>
                <span style={{ color:m.color, fontSize:13, fontWeight:600 }}>{m.user}</span>
                <span style={{ color:theme.textDim, fontSize:10 }}>{m.time}</span>
              </div>
              <div style={{ color:theme.textDim, fontSize:13, lineHeight:1.5 }}>{m.content}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:10, padding:10 }}>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:1, background:theme.bg, border:`1px solid ${theme.border}`, borderRadius:6,
            padding:"8px 10px", color:theme.textDim, fontSize:13 }}>Scrivi un messaggio...</div>
          <Btn small>Invia</Btn>
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:6 }}>
          👤 Come: <span style={{ color:theme.text }}>Mario_R</span> (profilo reale)
        </div>
      </div>
    </div>
  );
}

function NotificationsScreen({ nav }) {
  const [notifs, setNotifs] = useState([
    { icon:"⚔️", title:"Nuova Missione", body:"La Cripta Perduta — Il Drago di Pietra", time:"5 min fa", unread:true, type:"mission" },
    { icon:"✅", title:"PG Approvato", body:"Gandalf è stato approvato in Cronache Oscure", time:"2 ore fa", unread:true, type:"approved" },
    { icon:"🎲", title:"Missione Confermata", body:"Pattuglia Notturna — quorum raggiunto! Mer 21:00", time:"ieri", unread:false, type:"confirmed" },
    { icon:"💀", title:"Personaggio Deceduto", body:"Aragorn è stato segnato come MORTO in Il Drago di Pietra", time:"2 giorni fa", unread:false, type:"dead" },
    { icon:"@", title:"Menzione in Chat", body:"@Gandalf — Legolas ti ha menzionato in Piazza Centrale", time:"3 giorni fa", unread:false, type:"mention" },
    { icon:"🔓", title:"Missione Riaperta", body:"Pattuglia Notturna — un giocatore si è ritirato, posto disponibile!", time:"4 giorni fa", unread:false, type:"reopened" },
  ]);
  const typeColor = { mission:theme.info, approved:theme.success, confirmed:theme.accent, dead:theme.danger, mention:"#9b59b6", reopened:theme.warning };
  const markAllRead = () => setNotifs(p => p.map(n => ({...n, unread:false})));
  const unreadCount = notifs.filter(n=>n.unread).length;
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <h2 style={{ color:theme.text, margin:0 }}>Notifiche</h2>
          {unreadCount > 0 && <div style={{ background:theme.danger, color:"#fff", borderRadius:"50%",
            width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{unreadCount}</div>}
        </div>
        <span onClick={markAllRead} style={{ color:theme.textDim, fontSize:13, cursor:"pointer" }}>Segna tutte lette</span>
      </div>
      {notifs.map((n,i) => (
        <div key={i} onClick={() => setNotifs(p => p.map((x,j)=> j===i ? {...x,unread:false} : x))} style={{ display:"flex", gap:12,
          padding:"12px 14px", background: n.unread ? theme.surfaceHigh : theme.surface,
          border:`1px solid ${n.unread ? typeColor[n.type]+"44" : theme.border}`,
          borderLeft:`3px solid ${n.unread ? typeColor[n.type] : theme.border}`,
          borderRadius:8, marginBottom:8, cursor:"pointer" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:typeColor[n.type]+"22",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{n.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:theme.text, fontSize:14, fontWeight: n.unread ? 700 : 400 }}>{n.title}</span>
              <span style={{ color:theme.textDim, fontSize:11 }}>{n.time}</span>
            </div>
            <div style={{ color:theme.textDim, fontSize:13, lineHeight:1.4, marginTop:2 }}>{n.body}</div>
          </div>
          {n.unread && <div style={{ width:8, height:8, borderRadius:"50%", background:typeColor[n.type], flexShrink:0, marginTop:4 }} />}
        </div>
      ))}
    </div>
  );
}


// ── PROFILO ───────────────────────────────────────────────────────────

function ProfiloScreen({ nav }) {
  const menuItems = [
    { icon:"✏️", label:"Modifica Profilo", dest:"Modifica Profilo", sub:"Cambia bio, avatar, social" },
    { icon:"🧙", label:"Crea Personaggio", dest:"Crea Personaggio", sub:"Nuovo PG da zero" },
    { icon:"📜", label:"Gestisci Personaggi", dest:"Gestione Personaggi", sub:"Visualizza e modifica i tuoi PG" },
    { icon:"⚔️", label:"Crea Campagna", dest:"Crea Campagna", sub:"Diventa SUPER_MASTER" },
  ];
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      {/* Header profilo */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, padding:"14px", background:theme.surface, borderRadius:12, border:`1px solid ${theme.border}` }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:theme.accent+"33", border:`3px solid ${theme.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>🧙</div>
        <div style={{ flex:1 }}>
          <div style={{ color:theme.text, fontWeight:700, fontSize:18 }}>Mario_R</div>
          <div style={{ color:theme.textDim, fontSize:13, marginTop:2 }}>Avventuriero da lungo corso</div>
          <div style={{ display:"flex", gap:6, marginTop:6 }}>
            <Tag label="3 PG" color={theme.accent} />
            <Tag label="2 campagne" color={theme.info} />
          </div>
        </div>
      </div>
      {/* Menu voci */}
      {menuItems.map((item, i) => (
        <div key={i} onClick={() => nav(item.dest)} style={{ display:"flex", alignItems:"center", gap:12,
          padding:"14px", background:theme.surface, border:`1px solid ${theme.border}`,
          borderRadius:10, marginBottom:8, cursor:"pointer" }}>
          <div style={{ width:40, height:40, borderRadius:10, background:theme.surfaceHigh,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{item.icon}</div>
          <div style={{ flex:1 }}>
            <div style={{ color:theme.text, fontWeight:600, fontSize:14 }}>{item.label}</div>
            <div style={{ color:theme.textDim, fontSize:12, marginTop:2 }}>{item.sub}</div>
          </div>
          <span style={{ color:theme.textDim, fontSize:16 }}>›</span>
        </div>
      ))}
      <div style={{ marginTop:16, padding:"12px 14px", background:theme.surfaceHigh, borderRadius:10, cursor:"pointer" }}>
        <div style={{ color:theme.danger, fontSize:14, fontWeight:600 }}>🚪 Logout</div>
      </div>
    </div>
  );
}

function ModificaProfiloScreen({ nav }) {
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <span onClick={() => nav("Profilo")} style={{ color:theme.accent, cursor:"pointer", fontSize:20 }}>←</span>
        <h2 style={{ color:theme.text, margin:0, fontSize:18 }}>Modifica Profilo</h2>
      </div>
      {/* Avatar */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
        <div style={{ position:"relative", cursor:"pointer" }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:theme.accent+"33",
            border:`3px solid ${theme.accent}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>🧙</div>
          <div style={{ position:"absolute", bottom:0, right:0, background:theme.accent, borderRadius:"50%",
            width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✏️</div>
        </div>
      </div>
      {/* Campi */}
      <div style={{ marginBottom:12 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>USERNAME</div>
        <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:6, padding:"9px 12px", color:theme.textDim, fontSize:13 }}>Mario_R <span style={{ fontSize:11 }}>(non modificabile)</span></div>
      </div>
      {[["BIO","Avventuriero da lungo corso. Appassionato di GDR dal 2010."],["WHATSAPP","+39 333 123 4567"],["INSTAGRAM","instagram.com/mario_r_gdr"],["ALTRO SOCIAL",""]].map(([label, val]) => (
        <div key={label} style={{ marginBottom:12 }}>
          <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>{label}</div>
          <div style={{ background:theme.surface, border:`1px solid ${theme.accent}66`, borderRadius:6,
            padding:"9px 12px", color: val ? theme.text : theme.textDim, fontSize:13 }}>
            {val || `Aggiungi ${label.toLowerCase()}...`}
          </div>
        </div>
      ))}
      <div style={{ background:theme.surfaceHigh, borderRadius:8, padding:"10px 12px", marginBottom:20, fontSize:12 }}>
        <div style={{ color:theme.textDim }}>
          <span style={{ color:theme.warning }}>⚠️ Whatsapp</span> è visibile solo ai membri delle stesse campagne
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <div style={{ flex:1 }}><button onClick={() => nav("Profilo")} style={{ width:"100%", padding:"10px", background:"transparent",
          border:`1px solid ${theme.border}`, borderRadius:8, color:theme.textDim, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Annulla</button></div>
        <div style={{ flex:1 }}><button onClick={() => nav("Profilo")} style={{ width:"100%", padding:"10px", background:theme.accent,
          border:"none", borderRadius:8, color:"#0f0e17", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Salva</button></div>
      </div>
    </div>
  );
}

function GestionePersonaggiScreen({ nav }) {
  const pgs = [
    { name:"Gandalf il Grigio", status:"ACTIVE", campaign:"Il Drago di Pietra", role:"GIOCATORE", portrait:"🧙", color:"#9b59b6" },
    { name:"Aragorn", status:"RETIRED", campaign:"Il Drago di Pietra", role:"GIOCATORE", portrait:"⚔️", color:"#e67e22" },
    { name:"Brienne di Tarth", status:"DEAD", campaign:"Cronache Oscure", role:"GIOCATORE", portrait:"🛡️", color:"#c0392b" },
    { name:"Elara la Barda", status:"FREE", campaign:null, role:null, portrait:"🎵", color:"#2980b9" },
  ];
  const statusColor = s => s==="ACTIVE" ? theme.success : s==="RETIRED" ? theme.warning : s==="DEAD" ? theme.danger : theme.textDim;
  const statusLabel = s => s==="FREE" ? "NON ASSEGNATO" : s;
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <span onClick={() => nav("Profilo")} style={{ color:theme.accent, cursor:"pointer", fontSize:20 }}>←</span>
        <h2 style={{ color:theme.text, margin:0, fontSize:18, flex:1 }}>I Miei Personaggi</h2>
        <button onClick={() => nav("Crea Personaggio")} style={{ padding:"5px 12px", borderRadius:8, fontSize:12,
          background:theme.accent+"22", border:`1px solid ${theme.accent}`, color:theme.accent,
          cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>+ Nuovo</button>
      </div>
      {pgs.map((pg, i) => (
        <div key={i} onClick={() => nav("Scheda PG")} style={{ display:"flex", alignItems:"center", gap:12,
          padding:"12px 14px", background:theme.surface, border:`1px solid ${pg.status==="DEAD" ? theme.danger+"44" : theme.border}`,
          borderRadius:10, marginBottom:8, cursor:"pointer", opacity: pg.status==="DEAD" ? 0.7 : 1 }}>
          <div style={{ width:48, height:48, borderRadius:10, background:pg.color+"22",
            border:`2px solid ${pg.color}`, display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:22, flexShrink:0 }}>{pg.portrait}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <span style={{ color: pg.status==="DEAD" ? theme.danger : theme.text, fontWeight:600, fontSize:14,
                textDecoration: pg.status==="DEAD" ? "line-through" : "none" }}>{pg.name}</span>
              <Tag label={statusLabel(pg.status)} color={statusColor(pg.status)} />
            </div>
            {pg.campaign ? (
              <div style={{ color:theme.textDim, fontSize:12 }}>
                📍 <span style={{ color:theme.accent }}>{pg.campaign}</span>
                {pg.status==="DEAD" && <span style={{ color:theme.danger }}> • Caduto in battaglia</span>}
                {pg.status==="RETIRED" && <span style={{ color:theme.warning }}> • Ritirato</span>}
              </div>
            ) : (
              <div style={{ color:theme.textDim, fontSize:12 }}>📍 Nessuna campagna assegnata</div>
            )}
          </div>
          <span style={{ color:theme.textDim, fontSize:16 }}>›</span>
        </div>
      ))}
      <div style={{ marginTop:8, background:theme.surfaceHigh, borderRadius:8, padding:"10px 12px", fontSize:12, color:theme.textDim }}>
        Lo storico campagne di ogni PG (incluse copie) è visibile solo a te e non è pubblico.
      </div>
    </div>
  );
}

function SchedaPGScreen({ nav }) {
  const [portrait, setPortrait] = useState("🧙");
  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20, paddingBottom:40 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
        <span onClick={() => nav("Gestione Personaggi")} style={{ color:theme.accent, cursor:"pointer", fontSize:20 }}>←</span>
        <h2 style={{ color:theme.text, margin:0, fontSize:18, flex:1 }}>Modifica Personaggio</h2>
        <Tag label="ACTIVE" color={theme.success} />
      </div>
      {/* Portrait */}
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
        <div style={{ position:"relative", cursor:"pointer" }}>
          <div style={{ width:72, height:72, borderRadius:12, background:"#9b59b6"+"22",
            border:`2px solid #9b59b6`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>{portrait}</div>
          <div style={{ position:"absolute", bottom:0, right:0, background:theme.accent, borderRadius:"50%",
            width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>✏️</div>
        </div>
        <div>
          <div style={{ color:theme.text, fontWeight:700, fontSize:16 }}>Gandalf il Grigio</div>
          <div style={{ color:theme.textDim, fontSize:12, marginTop:2 }}>📍 Il Drago di Pietra</div>
          <div style={{ color:theme.textDim, fontSize:11, marginTop:4 }}>Portrait: JPG, PNG max 5MB</div>
        </div>
      </div>
      {/* Campi modificabili */}
      {[
        ["NOME PERSONAGGIO *", "Gandalf il Grigio"],
        ["BIOGRAFIA", "Stregone errante dalle origini misteriose. Ha percorso le terre per secoli, guidando eroi verso il loro destino..."],
        ["DESCRIZIONE ESTETICA", "Barba lunga e bianca, cappello a punta, bastone nodoso. Occhi che sembrano contenere stelle..."],
      ].map(([label, val]) => (
        <div key={label} style={{ marginBottom:12 }}>
          <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>{label}</div>
          <div style={{ background:theme.surface, border:`1px solid ${theme.accent}66`, borderRadius:6,
            padding:"9px 12px", color:theme.text, fontSize:13, lineHeight:1.6, minHeight: label.includes("BIO")||label.includes("ESTETICA") ? 70 : "auto" }}>{val}</div>
        </div>
      ))}
      {/* Campi non modificabili */}
      <div style={{ background:theme.surfaceHigh, borderRadius:8, padding:"10px 14px", marginBottom:20 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>CAMPI DI SOLA LETTURA</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <div style={{ color:theme.textDim, fontSize:12 }}>Modulo di gioco: <span style={{ color:theme.text }}>D&D 5e</span></div>
          <div style={{ color:theme.textDim, fontSize:12 }}>Campagna: <span style={{ color:theme.accent }}>Il Drago di Pietra</span></div>
        </div>
      </div>
      {/* Azioni stato */}
      <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:12, marginBottom:20 }}>
        <div style={{ color:theme.textDim, fontSize:11, marginBottom:8, fontFamily:"monospace" }}>STATO PERSONAGGIO</div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={{ flex:1, padding:"8px", background:theme.warning+"22", border:`1px solid ${theme.warning}`,
            borderRadius:6, color:theme.warning, fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
            ↩️ Ritira PG
          </button>
        </div>
        <div style={{ color:theme.textDim, fontSize:11, marginTop:6 }}>
          Il ritiro è reversibile. Solo il MASTER può segnare un PG come MORTO (permanente).
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <div style={{ flex:1 }}><button onClick={() => nav("Gestione Personaggi")} style={{ width:"100%", padding:"10px",
          background:"transparent", border:`1px solid ${theme.border}`, borderRadius:8, color:theme.textDim,
          fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Annulla</button></div>
        <div style={{ flex:1 }}><button onClick={() => nav("Gestione Personaggi")} style={{ width:"100%", padding:"10px",
          background:theme.accent, border:"none", borderRadius:8, color:"#0f0e17",
          fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Salva Modifiche</button></div>
      </div>
    </div>
  );
}

function GestioneCampagnaScreen({ nav }) {
  const [tab, setTab] = useState("info");
  const [modules, setModules] = useState({ stanze:true, missioni:true });
  const [showDelete, setShowDelete] = useState(false);
  const members = [
    { user:"Gino_M", pg:"Voce Narrante", role:"SUPER_MASTER", color:theme.accent, isFounder:true },
    { user:"Luigi_DM", pg:"Aldric", role:"MASTER", color:"#e74c3c" },
    { user:"Mario_R", pg:"Gandalf", role:"GIOCATORE", color:"#3498db" },
    { user:"Sara_86", pg:"Legolas", role:"CO_MASTER", color:"#9b59b6" },
    { user:"Luca_X", pg:"Aragorn", role:"GIOCATORE", color:"#27ae60" },
  ];
  const stanze = [
    { name:"Piazza Centrale", type:"ROLEPLAY", ttl:"48h", active:true },
    { name:"Mercato", type:"ROLEPLAY", ttl:"72h", active:true },
    { name:"Locanda del Drago", type:"SPAM", ttl:"24h", active:true },
    { name:"Prigioni", type:"ROLEPLAY", ttl:"72h", active:false },
  ];
  const tabs = [
    { id:"info", label:"Info" },
    { id:"moduli", label:"Moduli" },
    { id:"membri", label:"Membri" },
    { id:"stanze", label:"Stanze" },
    { id:"inviti", label:"Inviti" },
    { id:"danger", label:"⚠️" },
  ];
  const roleColor = r => r==="SUPER_MASTER" ? theme.accent : r==="MASTER" ? theme.danger : r==="CO_MASTER" ? "#9b59b6" : theme.textDim;

  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20, paddingBottom:40 }}>
      {showDelete && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"#000000dd",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20 }}>
          <div style={{ background:theme.surface, border:`1px solid ${theme.danger}`, borderRadius:12, padding:20, width:"100%", maxWidth:320 }}>
            <div style={{ color:theme.danger, fontWeight:700, fontSize:16, marginBottom:8 }}>🗑️ Elimina Campagna</div>
            <div style={{ color:theme.textDim, fontSize:13, marginBottom:16, lineHeight:1.6 }}>
              Tutti i personaggi torneranno liberi (campaign_id → NULL). Le stanze e le missioni verranno eliminate. Azione irreversibile.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex:1, padding:"9px", background:"transparent",
                border:`1px solid ${theme.border}`, borderRadius:6, color:theme.textDim, cursor:"pointer", fontFamily:"inherit" }}>Annulla</button>
              <button style={{ flex:1, padding:"9px", background:theme.danger, border:"none",
                borderRadius:6, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Elimina</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <span onClick={() => nav("Profilo")} style={{ color:theme.accent, cursor:"pointer", fontSize:20 }}>←</span>
        <h2 style={{ color:theme.text, margin:0, fontSize:18, flex:1 }}>Gestione Campagna</h2>
        <Tag label="SUPER_MASTER" color={theme.accent} />
      </div>
      <div style={{ color:theme.accent, fontWeight:700, fontSize:15, marginBottom:16 }}>⚔️ Il Drago di Pietra</div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:4, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
            background: tab===t.id ? theme.accent+"22" : "transparent",
            border:`1px solid ${tab===t.id ? theme.accent : theme.border}`,
            color: tab===t.id ? theme.accent : theme.textDim,
            fontFamily:"inherit", whiteSpace:"nowrap", flexShrink:0 }}>{t.label}</button>
        ))}
      </div>

      {/* TAB INFO */}
      {tab==="info" && (
        <div>
          {[["NOME CAMPAGNA","Il Drago di Pietra"],["DESCRIZIONE","Una campagna epica nei Regni Dimenticati. Solo per giocatori esperti."]].map(([l,v]) => (
            <div key={l} style={{ marginBottom:12 }}>
              <div style={{ color:theme.textDim, fontSize:11, marginBottom:4, fontFamily:"monospace" }}>{l}</div>
              <div style={{ background:theme.surface, border:`1px solid ${theme.accent}66`, borderRadius:6, padding:"9px 12px", color:theme.text, fontSize:13 }}>{v}</div>
            </div>
          ))}
          <div style={{ marginBottom:12 }}>
            <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>MODULO DI GIOCO</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["Generico","D&D 5e","Tabletop RPG","Kill Team"].map(g => (
                <div key={g} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
                  background: g==="D&D 5e" ? theme.accent+"22" : theme.surface,
                  border:`1px solid ${g==="D&D 5e" ? theme.accent : theme.border}`,
                  color: g==="D&D 5e" ? theme.accent : theme.textDim }}>{g}</div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>TAG</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["#dnd5e","#hardcore","#fantasy"].map(t => (
                <div key={t} style={{ padding:"4px 10px", borderRadius:20, fontSize:12, cursor:"pointer",
                  background:theme.accent+"22", border:`1px solid ${theme.accent}`, color:theme.accent }}>{t}</div>
              ))}
              <div style={{ padding:"4px 10px", borderRadius:20, fontSize:12, cursor:"pointer",
                background:"transparent", border:`1px dashed ${theme.border}`, color:theme.textDim }}>+ Aggiungi</div>
            </div>
          </div>
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:"0 14px", marginBottom:16 }}>
            {[["🔍 Ricercabile","Appare nella ricerca pubblica",true],["🚪 Aperta","Accetta nuove richieste",true]].map(([l,s,a]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${theme.border}` }}>
                <div><div style={{ color:theme.text, fontSize:13, fontWeight:600 }}>{l}</div><div style={{ color:theme.textDim, fontSize:11 }}>{s}</div></div>
                <div style={{ width:42, height:24, borderRadius:12, background: a ? theme.accent : theme.border, position:"relative", cursor:"pointer" }}>
                  <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%", position:"absolute", top:3, left: a ? 21 : 3 }} />
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => nav("Lista Campagne")} style={{ width:"100%", padding:"10px", background:theme.accent,
            border:"none", borderRadius:8, color:"#0f0e17", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Salva Modifiche</button>
        </div>
      )}

      {/* TAB MODULI */}
      {tab==="moduli" && (
        <div>
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, padding:"0 14px", marginBottom:16 }}>
            {[["🏠 Stanze","Chat contestuali per la campagna","stanze"],["⚔️ Missioni","Sistema missioni e iscrizioni","missioni"]].map(([l,s,k]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${theme.border}` }}>
                <div><div style={{ color:theme.text, fontSize:13, fontWeight:600 }}>{l}</div><div style={{ color:theme.textDim, fontSize:11 }}>{s}</div></div>
                <div onClick={() => setModules(p=>({...p,[k]:!p[k]}))} style={{ width:42, height:24, borderRadius:12, cursor:"pointer",
                  background: modules[k] ? theme.accent : theme.border, position:"relative", transition:"background 0.2s" }}>
                  <div style={{ width:18, height:18, background:"#fff", borderRadius:"50%", position:"absolute", top:3, left: modules[k] ? 21 : 3, transition:"left 0.2s" }} />
                </div>
              </div>
            ))}
            {[["🎲 Schede Personaggio","Schede strutturate per modulo"],["🗺️ Mappe","Mappe interattive"]].map(([l,s]) => (
              <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${theme.border}` }}>
                <div><div style={{ color:theme.textDim, fontSize:13, fontWeight:600 }}>{l}</div><div style={{ color:theme.textDim, fontSize:11 }}>{s}</div></div>
                <Tag label="PROSSIMAMENTE" color={theme.textDim} />
              </div>
            ))}
          </div>
          {(!modules.stanze && !modules.missioni) && <div style={{ color:theme.warning, fontSize:12, padding:"8px 0" }}>⚠️ Nessun modulo attivo</div>}
          {!modules.stanze && modules.missioni && <div style={{ color:theme.info, fontSize:12, padding:"8px 0" }}>ℹ️ Stanze disattive — le chat missione restano accessibili dal modulo Missioni</div>}
        </div>
      )}

      {/* TAB MEMBRI */}
      {tab==="membri" && (
        <div>
          <div style={{ color:theme.textDim, fontSize:12, marginBottom:12 }}>{members.length} membri totali</div>
          {members.map((m, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
              background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, marginBottom:6 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:m.color+"22",
                border:`2px solid ${m.color}`, display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700, color:m.color }}>{m.user[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:theme.text, fontWeight:600, fontSize:13 }}>{m.user}</span>
                  {m.isFounder && <Tag label="FONDATORE" color={theme.accent} />}
                </div>
                <div style={{ color:theme.textDim, fontSize:12 }}>{m.pg} • <span style={{ color:roleColor(m.role) }}>{m.role}</span></div>
              </div>
              {!m.isFounder && (
                <div style={{ display:"flex", gap:4 }}>
                  <div style={{ padding:"3px 8px", borderRadius:6, background:theme.surfaceHigh,
                    border:`1px solid ${theme.border}`, color:theme.textDim, fontSize:11, cursor:"pointer" }}>↑ Promuovi</div>
                  <div style={{ padding:"3px 8px", borderRadius:6, background:theme.danger+"22",
                    border:`1px solid ${theme.danger}`, color:theme.danger, fontSize:11, cursor:"pointer" }}>Ban</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB STANZE */}
      {tab==="stanze" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ color:theme.textDim, fontSize:12 }}>{stanze.length} stanze</span>
            <button style={{ padding:"5px 12px", borderRadius:8, fontSize:12, background:theme.accent+"22",
              border:`1px solid ${theme.accent}`, color:theme.accent, cursor:"pointer", fontFamily:"inherit" }}>+ Nuova</button>
          </div>
          {stanze.map((s,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
              background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:8, marginBottom:6,
              opacity: s.active ? 1 : 0.5 }}>
              <div style={{ fontSize:20 }}>{s.type==="ROLEPLAY" ? "🎭" : "💬"}</div>
              <div style={{ flex:1 }}>
                <div style={{ color:theme.text, fontWeight:600, fontSize:13 }}>{s.name}</div>
                <div style={{ display:"flex", gap:6, marginTop:3 }}>
                  <Tag label={s.type} color={s.type==="ROLEPLAY" ? theme.accent : theme.info} />
                  <span style={{ color:theme.textDim, fontSize:11 }}>TTL {s.ttl}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <div style={{ padding:"3px 8px", borderRadius:6, background:theme.surfaceHigh,
                  border:`1px solid ${theme.border}`, color:theme.textDim, fontSize:11, cursor:"pointer" }}>✏️</div>
                <div style={{ padding:"3px 8px", borderRadius:6, background: s.active ? theme.warning+"22" : theme.success+"22",
                  border:`1px solid ${s.active ? theme.warning : theme.success}`,
                  color: s.active ? theme.warning : theme.success, fontSize:11, cursor:"pointer" }}>
                  {s.active ? "Disattiva" : "Attiva"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB INVITI */}
      {tab==="inviti" && (
        <div>
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ color:theme.textDim, fontSize:11, marginBottom:6, fontFamily:"monospace" }}>CODICE INVITO ATTIVO</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ flex:1, background:theme.bg, border:`1px solid ${theme.accent}`, borderRadius:6,
                padding:"8px 12px", color:theme.accent, fontSize:16, fontWeight:700, fontFamily:"monospace",
                letterSpacing:3 }}>DRAGO-7X9K</div>
              <div style={{ padding:"8px 12px", background:theme.accent+"22", border:`1px solid ${theme.accent}`,
                borderRadius:6, color:theme.accent, fontSize:12, cursor:"pointer" }}>📋 Copia</div>
            </div>
            <div style={{ color:theme.textDim, fontSize:12, marginTop:8 }}>
              Scadenza: <span style={{ color:theme.text }}>31/12/2024</span> •
              Usi: <span style={{ color:theme.text }}>3/10</span> •
              <span style={{ color:theme.danger, cursor:"pointer" }}> Revoca</span>
            </div>
          </div>
          <button style={{ width:"100%", padding:"10px", background:theme.accent+"22",
            border:`1px solid ${theme.accent}`, borderRadius:8, color:theme.accent,
            fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:12 }}>
            + Genera Nuovo Codice
          </button>
          <div style={{ color:theme.textDim, fontSize:11 }}>
            Possono generare inviti: MASTER e SUPER_MASTER.<br/>
            Impostazioni opzionali: scadenza, numero massimo di utilizzi.
          </div>
        </div>
      )}

      {/* TAB DANGER */}
      {tab==="danger" && (
        <div>
          <div style={{ background:theme.danger+"11", border:`1px solid ${theme.danger}44`, borderRadius:10, padding:14, marginBottom:12 }}>
            <div style={{ color:theme.danger, fontWeight:700, fontSize:14, marginBottom:8 }}>⚠️ Zona Pericolosa</div>
            <div style={{ color:theme.textDim, fontSize:13, lineHeight:1.6, marginBottom:14 }}>
              Queste azioni sono irreversibili. Solo il SUPER_MASTER fondatore può eseguirle.
            </div>
            <div style={{ display:"flex", gap:10, flexDirection:"column" }}>
              <button style={{ padding:"10px", background:theme.warning+"22", border:`1px solid ${theme.warning}`,
                borderRadius:8, color:theme.warning, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                🔒 Chiudi Campagna<div style={{ fontWeight:400, fontSize:11, marginTop:2, color:theme.textDim }}>Blocca nuove iscrizioni. La campagna resta visibile e attiva.</div>
              </button>
              <button onClick={() => setShowDelete(true)} style={{ padding:"10px", background:theme.danger+"22",
                border:`1px solid ${theme.danger}`, borderRadius:8, color:theme.danger,
                fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", textAlign:"left" }}>
                🗑️ Elimina Campagna<div style={{ fontWeight:400, fontSize:11, marginTop:2, color:theme.textDim }}>Elimina definitivamente. I PG tornano liberi.</div>
              </button>
            </div>
          </div>
          <div style={{ color:theme.textDim, fontSize:11 }}>Per trasferire l'ownership contatta il supporto o promuovi un altro SUPER_MASTER.</div>
        </div>
      )}
    </div>
  );
}


function SelezionaPGScreen({ nav }) {
  const [selected, setSelected] = useState(null);
  // Questa è la campagna a cui si vuole accedere
  const campagna = "Il Drago di Pietra";

  const pgs = [
    // Liberi — disponibili
    { name:"Elara la Barda", portrait:"🎵", color:"#2980b9", stato:"FREE", motivo:null },
    // Ritirato DA QUESTA STESSA campagna — può tornare
    { name:"Aragorn", portrait:"⚔️", color:"#e67e22", stato:"RETIRED_HERE", motivo:"Ritirato da questa campagna" },
    // Già assegnato attivo altrove — bloccato
    { name:"Gandalf il Grigio", portrait:"🧙", color:"#9b59b6", stato:"ACTIVE_ELSEWHERE", motivo:"Attivo in: Il Mercante Misterioso" },
    // Ritirato in ALTRA campagna — bloccato
    { name:"Legolas Pino", portrait:"🏹", color:"#27ae60", stato:"RETIRED_ELSEWHERE", motivo:"Ritirato da: Cronache Oscure" },
    // Morto — bloccato
    { name:"Brienne di Tarth", portrait:"🛡️", color:"#c0392b", stato:"DEAD", motivo:"Caduta in: Cronache Oscure" },
  ];

  const isSelectable = s => s === "FREE" || s === "RETIRED_HERE";
  const btnLabel = s => s === "RETIRED_HERE" ? "Torna in campagna" : "Entra in campagna";
  const lockReason = s => {
    if (s === "ACTIVE_ELSEWHERE") return "PG già attivo in un'altra campagna";
    if (s === "RETIRED_ELSEWHERE") return "PG ritirato da altra campagna — non trasferibile";
    if (s === "DEAD") return "PG deceduto — non può partecipare";
    return null;
  };
  const tagColor = s => {
    if (s === "FREE") return theme.success;
    if (s === "RETIRED_HERE") return theme.warning;
    if (s === "DEAD") return theme.danger;
    return theme.textDim;
  };
  const tagLabel = s => {
    if (s === "FREE") return "DISPONIBILE";
    if (s === "RETIRED_HERE") return "RITIRATO QUI";
    if (s === "ACTIVE_ELSEWHERE") return "ATTIVO ALTROVE";
    if (s === "RETIRED_ELSEWHERE") return "RITIRATO ALTROVE";
    if (s === "DEAD") return "MORTO";
    return s;
  };

  return (
    <div style={{ maxWidth:400, margin:"0 auto", paddingTop:20, paddingBottom:40 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
        <span onClick={() => nav("Scheda Campagna")} style={{ color:theme.accent, cursor:"pointer", fontSize:20 }}>←</span>
        <h2 style={{ color:theme.text, margin:0, fontSize:18 }}>Scegli Personaggio</h2>
      </div>
      <div style={{ color:theme.textDim, fontSize:13, marginBottom:20 }}>
        Per: <span style={{ color:theme.accent, fontWeight:600 }}>{campagna}</span>
      </div>

      {pgs.map((pg, i) => {
        const selectable = isSelectable(pg.stato);
        const isSelected = selected === pg.name;
        return (
          <div key={i} onClick={() => selectable && setSelected(pg.name)} style={{
            display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
            background: isSelected ? theme.accent+"11" : theme.surface,
            border:`1px solid ${isSelected ? theme.accent : selectable ? theme.border : theme.border+"44"}`,
            borderRadius:10, marginBottom:8,
            cursor: selectable ? "pointer" : "not-allowed",
            opacity: selectable ? 1 : 0.45,
          }}>
            <div style={{ width:48, height:48, borderRadius:10,
              background: pg.color+"22", border:`2px solid ${selectable ? pg.color : theme.border}`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>
              {pg.stato === "DEAD" ? "💀" : pg.portrait}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <span style={{ color: pg.stato==="DEAD" ? theme.danger : selectable ? theme.text : theme.textDim,
                  fontWeight:600, fontSize:14,
                  textDecoration: pg.stato==="DEAD" ? "line-through" : "none" }}>{pg.name}</span>
                <Tag label={tagLabel(pg.stato)} color={tagColor(pg.stato)} />
              </div>
              {pg.motivo && <div style={{ color:theme.textDim, fontSize:12 }}>{pg.motivo}</div>}
              {!selectable && lockReason(pg.stato) && (
                <div style={{ color:theme.textDim, fontSize:11, marginTop:2 }}>🔒 {lockReason(pg.stato)}</div>
              )}
            </div>
            {isSelected && <span style={{ color:theme.accent, fontSize:20 }}>✓</span>}
          </div>
        );
      })}

      {/* Flag futuro */}
      <div style={{ background:theme.surfaceHigh, border:`1px dashed ${theme.border}`, borderRadius:8, padding:"10px 12px", marginBottom:20, marginTop:4 }}>
        <div style={{ color:theme.textDim, fontSize:12 }}>
          🔮 <span style={{ color:theme.accent }}>In futuro:</span> se la campagna abilita <em>"permetti import da altre campagne"</em>, i PG ritirati altrove diventeranno selezionabili.
        </div>
      </div>

      <button
        disabled={!selected}
        onClick={() => selected && nav("Lista Campagne")}
        style={{ width:"100%", padding:"12px", borderRadius:8, fontSize:15, fontWeight:700,
          fontFamily:"inherit", cursor: selected ? "pointer" : "not-allowed",
          background: selected ? theme.accent : theme.surfaceHigh,
          border: selected ? "none" : `1px solid ${theme.border}`,
          color: selected ? "#0f0e17" : theme.textDim,
          opacity: selected ? 1 : 0.6 }}>
        {selected
          ? (pgs.find(p=>p.name===selected)?.stato === "RETIRED_HERE"
              ? `↩️ Torna in campagna con ${selected}`
              : `⚔️ Entra in campagna con ${selected}`)
          : "Seleziona un personaggio"}
      </button>
      {selected && (
        <p style={{ color:theme.textDim, fontSize:11, marginTop:8, textAlign:"center" }}>
          La richiesta andrà in stato PENDING fino all'approvazione del MASTER.
        </p>
      )}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [active, setActive] = useState("Login");
  const nav = screen => setActive(screen);

  const renderScreen = () => {
    const props = { nav };
    switch(active) {
      case "Login": return <LoginScreen {...props} />;
      case "Registrazione": return <RegisterScreen {...props} />;
      case "Crea Personaggio": return <CreateCharacterScreen {...props} />;
      case "Lista Campagne": return <CampaignListScreen {...props} />;
      case "Crea Campagna": return <CreaCampagnaScreen {...props} />;
      case "Scheda Campagna": return <CampaignDetailScreen {...props} />;
      case "Approvazione PG": return <ApprovalScreen {...props} />;
      case "Missioni": return <MissionsScreen {...props} />;
      case "Stanze": return <StanzeScreen {...props} />;
      case "Chat Stanza": return <RoleplayChatScreen {...props} />;
      case "Chat Missione": return <MissionChatScreen {...props} />;
      case "Notifiche": return <NotificationsScreen {...props} />;
      case "Profilo": return <ProfiloScreen {...props} />;
      case "Modifica Profilo": return <ModificaProfiloScreen {...props} />;
      case "Gestione Personaggi": return <GestionePersonaggiScreen {...props} />;
      case "Scheda PG": return <SchedaPGScreen {...props} />;
      case "Gestione Campagna": return <GestioneCampagnaScreen {...props} />;
      case "Seleziona PG": return <SelezionaPGScreen {...props} />;
      default: return <LoginScreen {...props} />;
    }
  };

  return (
    <div style={{ background:theme.bg, minHeight:"100vh", color:theme.text, fontFamily:"'Segoe UI', sans-serif" }}>
      {/* Top bar */}
      <div style={{ background:theme.surface, borderBottom:`1px solid ${theme.border}`,
        padding:"10px 16px", display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:18 }}>⚔️</span>
          <span style={{ color:theme.accent, fontWeight:700, fontSize:14, fontFamily:"Georgia,serif" }}>Taverna del Codice</span>
          <Tag label="WIREFRAMES v1.4" color={theme.textDim} />
        </div>
        <div style={{ color:theme.textDim, fontSize:12 }}>Schermata: <span style={{ color:theme.accent }}>{active}</span></div>
      </div>
      {/* Screen selector */}
      <div style={{ background:theme.surfaceHigh, borderBottom:`1px solid ${theme.border}`,
        padding:"8px 12px", overflowX:"auto", display:"flex", gap:6, whiteSpace:"nowrap" }}>
        {screens.map(s => (
          <button key={s} onClick={() => setActive(s)} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer",
            background: active===s ? theme.accent+"22" : "transparent",
            border:`1px solid ${active===s ? theme.accent : theme.border}`,
            color: active===s ? theme.accent : theme.textDim,
            fontFamily:"inherit", whiteSpace:"nowrap" }}>{s}</button>
        ))}
      </div>
      {/* Phone frame */}
      <div style={{ display:"flex", justifyContent:"center", padding:"24px 16px" }}>
        <div style={{ width:390, minHeight:700, background:theme.bg, border:`2px solid ${theme.border}`,
          borderRadius:24, overflow:"hidden", boxShadow:`0 0 40px ${theme.accent}22` }}>
          <div style={{ background:theme.surface, padding:"8px 20px",
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:theme.textDim, fontSize:11 }}>9:41</span>
            <span style={{ color:theme.textDim, fontSize:11 }}>📶 🔋</span>
          </div>
          <div style={{ padding:"0 16px 24px", overflowY:"auto", maxHeight:"calc(100vh - 220px)" }}>
            {renderScreen()}
          </div>
          <div style={{ background:theme.surface, borderTop:`1px solid ${theme.border}`,
            display:"flex", justifyContent:"space-around", padding:"10px 0" }}>
            {[["🏕️","Campagne","Lista Campagne"],["⚔️","Missioni","Missioni"],["💬","Chat","Stanze"],["🔔","Notifiche","Notifiche"],["👤","Profilo","Profilo"]].map(([icon,label,dest]) => (
              <div key={label} onClick={() => nav(dest)} style={{ textAlign:"center", cursor:"pointer" }}>
                <div style={{ fontSize:18 }}>{icon}</div>
                <div style={{ color: active===dest ? theme.accent : theme.textDim, fontSize:9 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ textAlign:"center", color:theme.textDim, fontSize:11, paddingBottom:20 }}>
        Wireframes interattivi — Taverna del Codice v1.4 — seleziona schermata o naviga dai link interni
      </div>
    </div>
  );
}
