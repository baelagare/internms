import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, StatusBadge, SummaryMetrics } from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { useMutation } from '../components/workflow.jsx';
import { contactsFor } from '../services/records.js';
import { postMessage } from '../services/applicationService.js';
import './messages.css';

const ROLE_LABELS = { coordinator: 'OJT Coordinator', supervisor: 'Host company representative', student: 'Student intern', admin: 'Administrator' };
const roleLabel = role => ROLE_LABELS[role] || 'InternMS contact';

const SUBTITLES = {
  coordinator: 'Conversations with students and staff permitted for your college.',
  supervisor: 'Conversations with interns and coordinators assigned to your company.',
  student: 'Conversations with your college coordinator, host company supervisor, and administrator.',
  admin: 'University-wide messaging directory.'
};

export function Messages({ user, db = {}, onChange, connectionStatus = 'offline' }) {
  const id = useId();
  const contacts = useMemo(() => contactsFor(db, user), [db, user]);
  const [selected, setSelected] = useState(contacts[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [threadOpen, setThreadOpen] = useState(false);
  const logRef = useRef(null);
  const { busy, run, notice } = useMutation(onChange);

  useEffect(() => {
    if (!contacts.some(contact => contact.id === selected)) {
      setSelected(contacts[0]?.id ?? null);
      setThreadOpen(false);
    }
  }, [contacts, selected]);

  const partner = contacts.find(contact => contact.id === selected) || null;
  const messages = useMemo(() => {
    if (!partner || !user?.id) return [];
    return (db.messages || []).filter(message =>
      (message.senderId === user.id && message.recipientId === partner.id) ||
      (message.senderId === partner.id && message.recipientId === user.id)
    );
  }, [db.messages, partner, user?.id]);

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [partner?.id, messages.length]);

  const filteredContacts = contacts.filter(contact =>
    `${contact.name || ''} ${roleLabel(contact.role)} ${contact.college || ''} ${contact.company || ''}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  async function handleSend(event) {
    event.preventDefault();
    const content = text.trim();
    if (!partner || !content || busy) return;
    const sent = await run(() => postMessage(user, partner.id, content), 'Message sent.');
    if (sent) setText('');
  }

  const admin = user?.role === 'admin';
  return (
    <div className="messages-page">
      <PageHeader title="Messages" subtitle={SUBTITLES[user?.role] || 'Conversations with your permitted InternMS contacts.'} />
      {admin && <SummaryMetrics className="messages-directory" ariaLabel="Messages directory" accent="info" items={[
        { label: 'OJT coordinators', value: contacts.filter(contact => contact.role === 'coordinator').length },
        { label: 'Host representatives', value: contacts.filter(contact => contact.role === 'supervisor').length },
        { label: 'Student interns', value: contacts.filter(contact => contact.role === 'student').length }
      ]} />}
      {connectionStatus !== 'connected' && <div className="messages-banner" role="status">
        Messages are read-only until the backend is connected. Sending is unavailable until the backend is connected. Real-time message exchange will become available in Phase 4.
      </div>}
      {notice && <div className="messages-feedback">{notice}</div>}
      <div className="messages-layout">
        <Card as="aside" aria-label="Contacts" className={`messages-contacts ${threadOpen ? 'messages-mobile-hidden' : ''}`}>
          <div className="messages-contacts-header"><h2>Contacts</h2><span className="ds-badge ds-tone--neutral" aria-label={`${contacts.length} contacts`}>{contacts.length}</span></div>
          <label className="sr-only" htmlFor={`${id}-contact-search`}>Search contacts</label>
          <div className="messages-search"><Icon name="search" /><input id={`${id}-contact-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search contacts" /></div>
          {filteredContacts.length ? <ul className="messages-contact-list" aria-label="Available conversations">
            {filteredContacts.map(contact => <li key={contact.id}><button type="button" className={`messages-contact ${partner?.id === contact.id ? 'is-selected' : ''}`} aria-current={partner?.id === contact.id ? 'true' : undefined} onClick={() => { setSelected(contact.id); setThreadOpen(true); }}>
              <span className="messages-contact-avatar" aria-hidden="true">{(contact.name || '?').trim().slice(0, 1).toLocaleUpperCase()}</span>
              <span className="messages-contact-copy"><strong>{contact.name || 'Contact'}</strong><span>{roleLabel(contact.role)}</span></span><Icon name="chevron" className="messages-contact-chevron" />
            </button></li>)}
          </ul> : <EmptyState title={contacts.length ? 'No contacts match' : 'No contacts available'} description={contacts.length ? 'Try another search.' : 'Contacts appear when your role has eligible conversations.'} icon="users" />}
        </Card>

        <Card as="section" aria-label={partner ? `Conversation with ${partner.name}` : 'Conversation'} className={`messages-thread ${threadOpen ? '' : 'messages-mobile-hidden'}`}>
          {partner ? <>
            <header className="messages-thread-header">
              <Button variant="quiet" className="messages-back" onClick={() => setThreadOpen(false)} aria-label="Back to contacts"><Icon name="arrow" /> Contacts</Button>
              <div className="messages-thread-person"><h2>{partner.name || 'Contact'}</h2><p>{roleLabel(partner.role)}</p></div>
            </header>
            <div className="messages-log" ref={logRef} role="log" aria-live="polite" aria-label={`Messages with ${partner.name}`}>
              {messages.length ? messages.map((message, index) => { const own = message.senderId === user?.id; return <article key={message.id ?? `${message.senderId}-${message.time}-${index}`} className={`messages-row ${own ? 'is-own' : ''}`}>
                <div className="messages-bubble"><div className="messages-meta"><span>{own ? 'You' : message.senderName || partner.name}</span>{message.time && <time>{message.time}</time>}</div><p>{message.text}</p></div>
              </article>; }) : <EmptyState title="No messages yet" description={`Start a conversation with ${partner.name || 'this contact'}.`} icon="chat" />}
            </div>
            <form className="messages-compose" onSubmit={handleSend}>
              <label className="sr-only" htmlFor={`${id}-message`}>Message to {partner.name || 'contact'}</label>
              <textarea id={`${id}-message`} rows="2" value={text} onChange={event => setText(event.target.value)} disabled={busy} maxLength={4000} placeholder="Write a message…" />
              <Button type="submit" disabled={busy || !text.trim()} loading={busy} loadingLabel="Sending…"><Icon name="send" /> Send</Button>
            </form>
          </> : <EmptyState
            title={contacts.length ? 'Choose a conversation' : 'No contacts available'}
            description={
              contacts.length
                ? 'Select a contact from the list to view messages.'
                : user?.role === 'supervisor'
                ? 'Contacts will appear when interns or college coordinators are assigned to your company.'
                : admin
                ? 'Contacts appear when other staff or student accounts are recorded.'
                : 'Contacts appear when your role has eligible conversations.'
            }
            icon="chat"
          />}
        </Card>
      </div>
    </div>
  );
}
