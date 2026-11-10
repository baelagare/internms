import { useEffect, useId, useRef, useState } from 'react';
import {
  Button,
  Card,
  EmptyState,
  StatusBadge
} from '../components/ui.jsx';
import { Icon } from '../components/Icons.jsx';
import { useMutation } from '../components/workflow.jsx';
import { contactsFor } from '../services/localRepository.js';
import { postMessage } from '../services/applicationService.js';

const ROLE_LABELS = {
  coordinator: 'OJT Coordinator',
  supervisor: 'Host Supervisor',
  student: 'Student Intern',
  admin: 'Administrator'
};

function formatRoleLabel(role = '') {
  return ROLE_LABELS[role] || role;
}

export function Messages({ user, db, onChange }) {
  const id = useId();
  const contacts = contactsFor(db, user);
  const [selected, setSelected] = useState(contacts[0]?.id);
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [threadOpen, setThreadOpen] = useState(false);

  const searchInputRef = useRef(null);
  const logRef = useRef(null);

  const { busy, run } = useMutation(onChange);

  useEffect(() => {
    if (!selected && contacts[0]?.id) {
      setSelected(contacts[0].id);
    }
  }, [contacts, selected]);

  const partner = contacts.find(contact => contact.id === selected) || contacts[0] || null;
  const allMessages = db.messages || [];

  const getThreadMessages = contactId =>
    allMessages.filter(
      message =>
        (message.senderId === user.id && message.recipientId === contactId) ||
        (message.senderId === contactId && message.recipientId === user.id)
    );

  const messages = partner ? getThreadMessages(partner.id) : [];

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [partner?.id, messages.length, threadOpen]);

  const filteredContacts = contacts.filter(contact =>
    `${contact.name} ${formatRoleLabel(contact.role)} ${contact.role} ${contact.college || ''} ${
      contact.company || ''
    }`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  async function handleSend(event) {
    event.preventDefault();
    if (!partner || !text.trim() || busy) return;
    const sent = await run(
      () => postMessage(user, partner.id, text),
      `Message sent to ${partner.name}.`
    );
    if (sent) {
      setText('');
    }
  }

  return (
    <div className="student-messages flex h-[calc(100dvh-156px)] flex-col overflow-hidden md:h-[calc(100dvh-104px)]">
      <h1 className="sr-only">Messages</h1>

      <div className="grid flex-1 min-h-0 gap-4 md:grid-cols-[20rem_1fr]">
        {/* 1. FIXED LEFT CONTACTS PANEL */}
        <Card
          as="aside"
          className={`flex h-full min-h-0 flex-col overflow-hidden ${
            threadOpen ? 'hidden md:flex' : 'flex'
          }`}
          aria-label="Contacts"
        >
          {/* Compact Fixed Search Header */}
          <div className="shrink-0 space-y-2.5 border-b border-slate-200 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-navy-950">Contacts</h2>
              <StatusBadge tone="neutral">{contacts.length}</StatusBadge>
            </div>

            <div className="relative">
              <label htmlFor={`${id}-contact-search`} className="sr-only">
                Search contacts
              </label>
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                id={`${id}-contact-search`}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search contacts…"
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-slate-50/60 py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/20"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 min-h-0 divide-y divide-slate-200 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title={query ? 'No matching contacts' : 'No contacts available'}
                  description={
                    query
                      ? 'Try another name or role.'
                      : 'Contacts appear once your college or host company is assigned.'
                  }
                  action={
                    query && (
                      <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                        Clear search
                      </Button>
                    )
                  }
                />
              </div>
            ) : (
              filteredContacts.map(contact => {
                const isSelected = partner?.id === contact.id;
                const thread = getThreadMessages(contact.id);
                const lastMessage = thread[thread.length - 1];

                return (
                  <button
                    key={contact.id}
                    type="button"
                    aria-pressed={isSelected}
                    className={`flex min-h-[68px] w-full flex-col justify-center gap-1 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? 'border-l-4 border-l-navy-700 bg-navy-50/80 text-navy-950'
                        : 'border-l-4 border-l-transparent bg-white hover:bg-slate-50 text-slate-900'
                    }`}
                    onClick={() => {
                      setSelected(contact.id);
                      setText('');
                      setThreadOpen(true);
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <strong className="truncate text-sm font-bold text-slate-900">
                        {contact.name}
                      </strong>
                      {lastMessage?.time && (
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          {lastMessage.time}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-semibold text-navy-800">
                      {formatRoleLabel(contact.role)} · {contact.college || contact.company}
                    </span>

                    <p className="truncate text-xs text-slate-500">
                      {lastMessage
                        ? `${lastMessage.senderId === user.id ? 'You: ' : ''}${lastMessage.text}`
                        : 'No messages yet'}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* 2. RIGHT COLUMN: SCROLLABLE CONVERSATION CARD + SEPARATE FIXED INPUT BAR */}
        <div
          className={`flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden ${
            !threadOpen ? 'hidden md:flex' : 'flex'
          }`}
          aria-label="Conversation"
        >
          {partner ? (
            <>
              {/* 2A. Scrollable Conversation Card */}
              <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
                {/* Fixed Conversation Header */}
                <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="md:hidden"
                      onClick={() => setThreadOpen(false)}
                    >
                      <Icon name="arrowLeft" size={16} />
                      Back
                    </Button>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-slate-900">{partner.name}</h2>
                      <p className="truncate text-xs text-slate-600">
                        {formatRoleLabel(partner.role)} · {partner.college || partner.company}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone="blue">{formatRoleLabel(partner.role)}</StatusBadge>
                </header>

                {/* Scrollable Message Thread (ONLY scrollable area) */}
                <div
                  ref={logRef}
                  className="flex-1 min-h-0 space-y-3 overflow-y-auto bg-slate-50/40 p-5"
                  role="log"
                  aria-live="polite"
                  aria-label={`Messages with ${partner.name}`}
                >
                  {messages.length > 0 ? (
                    messages.map((message, index) => {
                      const isOwn = message.senderId === user.id;
                      return (
                        <article
                          key={message.id || index}
                          className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-xl px-4 py-2.5 sm:max-w-[75%] ${
                              isOwn
                                ? 'bg-navy-700 text-white'
                                : 'border border-slate-200 bg-white text-slate-900'
                            }`}
                          >
                            <div
                              className={`mb-1 flex items-center gap-2 text-xs font-semibold ${
                                isOwn ? 'text-navy-100' : 'text-slate-500'
                              }`}
                            >
                              <span>{isOwn ? 'You' : message.senderName}</span>
                              <span>·</span>
                              <span className="tabular-nums">{message.time}</span>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {message.text}
                            </p>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="flex h-full items-center justify-center py-8">
                      <EmptyState
                        title="No messages yet"
                        description={`Send a message below to start a conversation with ${partner.name}.`}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {/* 2B. Separate Fixed Message Input Bar */}
              <Card className="shrink-0 p-3">
                <form className="flex items-center gap-2.5" onSubmit={handleSend}>
                  <label htmlFor={`${id}-message-input`} className="sr-only">
                    {`Message to ${partner.name}`}
                  </label>
                  <input
                    id={`${id}-message-input`}
                    type="text"
                    required
                    value={text}
                    onChange={event => setText(event.target.value)}
                    disabled={busy}
                    placeholder={`Write a message to ${partner.name}…`}
                    className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={busy || !text.trim()}
                    className="shrink-0"
                  >
                    <Icon name="send" size={16} />
                    {busy ? 'Sending…' : 'Send'}
                  </Button>
                </form>
              </Card>
            </>
          ) : (
            <Card className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                title="No contacts available"
                description="Contacts appear once your college coordinator and host company are assigned."
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
