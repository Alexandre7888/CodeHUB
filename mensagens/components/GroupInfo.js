function GroupInfo({ activeChat, user, onClose }) {
    const [members, setMembers] = React.useState([]);
    const [isAdmin, setIsAdmin] = React.useState(false);
    const [customRoles, setCustomRoles] = React.useState({});
    const [permissions, setPermissions] = React.useState({
        sendText: true,
        sendAudio: true,
        sendVideo: true,
        sendMedia: true,
        manageCalls: false // New permission
    });

    React.useEffect(() => {
        if (!activeChat || activeChat.type !== 'group') return;

        const groupRef = window.firebaseDB.ref(`groups/${activeChat.id}`);
        
        groupRef.on('value', snapshot => {
            const data = snapshot.val();
            if (data) {
                if (data.permissions) setPermissions(data.permissions);
                if (data.roles) setCustomRoles(data.roles || {});
                
                const memberIds = Object.keys(data.members || {});
                
                // Check if current user is admin
                const myRole = data.members[user.id];
                setIsAdmin(myRole === 'admin');

                Promise.all(memberIds.map(id => 
                    window.firebaseDB.ref(`users/${id}`).once('value').then(s => {
                        const roleKey = data.members[id];
                        let roleName = roleKey === 'admin' ? 'Admin' : (roleKey === 'member' ? 'Membro' : (data.roles?.[roleKey]?.name || 'Membro'));
                        
                        return {
                            id, 
                            ...s.val(), 
                            roleKey: roleKey,
                            roleName: roleName
                        }
                    })
                )).then(loadedMembers => {
                    setMembers(loadedMembers);
                });
            }
        });

        return () => groupRef.off();
    }, [activeChat]);

    // Group members by role for display
    const groupedMembers = React.useMemo(() => {
        const groups = {
            'admin': [],
            'member': []
        };
        
        // Initialize custom role arrays
        Object.keys(customRoles).forEach(rId => groups[rId] = []);

        members.forEach(m => {
            if (groups[m.roleKey]) {
                groups[m.roleKey].push(m);
            } else {
                groups['member'].push(m);
            }
        });

        return groups;
    }, [members, customRoles]);

    const togglePermission = (key) => {
        if (!isAdmin) return;
        const newPerms = { ...permissions, [key]: !permissions[key] };
        window.firebaseDB.ref(`groups/${activeChat.id}/permissions`).set(newPerms);
    };

    const assignRole = (memberId, roleKey) => {
        window.firebaseDB.ref(`groups/${activeChat.id}/members/${memberId}`).set(roleKey);
    };

    const createRole = () => {
        const name = prompt("Nome do novo cargo:");
        if (name) {
            const roleId = 'role_' + Date.now();
            window.firebaseDB.ref(`groups/${activeChat.id}/roles/${roleId}`).set({ name: name, color: '#00a884' });
        }
    };

    const addMember = async () => {
        const memberId = prompt("Digite o ID do usuário para adicionar:");
        if (!memberId) return;
        
        if (members.find(m => m.id === memberId)) {
            alert("Usuário já está no grupo.");
            return;
        }

        try {
            // Check if user exists
            const userSnap = await window.firebaseDB.ref(`users/${memberId}`).once('value');
            if (!userSnap.exists()) {
                alert("Usuário não encontrado.");
                return;
            }

            // Check User Privacy Settings
            const settingsSnap = await window.firebaseDB.ref(`users/${memberId}/settings`).once('value');
            const targetSettings = settingsSnap.val() || {};
            const privacy = targetSettings.groupPrivacy || 'everyone'; // default
            
            let allowed = true;
            
            if (privacy === 'nobody') {
                allowed = false;
            } else if (privacy === 'contacts' || privacy === 'blacklist') {
                // Check if I (user.id) am in target's contacts
                // NOTE: This assumes 'contacts' list is strictly mutual or we can read it.
                // In this architecture, we can read public paths. Let's assume we can check `users/{target}/contacts/{me}`.
                const contactSnap = await window.firebaseDB.ref(`users/${memberId}/contacts/${user.id}`).once('value');
                const isContact = contactSnap.exists();
                
                if (privacy === 'contacts' && !isContact) {
                    allowed = false;
                } else if (privacy === 'blacklist') {
                    const blacklist = targetSettings.groupBlacklist || {};
                    if (blacklist[user.id]) allowed = false;
                    // Note: 'blacklist' implies "Everyone except...", normally.
                    // If logic is "My Contacts Except...", then we need to check contact AND blacklist.
                    // Usually "My Contacts Except" means: Must be contact AND not in blacklist.
                    // If the UI says "My Contacts, except...", then:
                    if (!isContact) allowed = false; // Must be contact
                    if (blacklist[user.id]) allowed = false; // Must not be blocked
                }
            }

            if (!allowed) {
                alert("Não foi possível adicionar este usuário devido às configurações de privacidade dele.");
                return;
            }

            // Add member
            window.firebaseDB.ref(`groups/${activeChat.id}/members/${memberId}`).set('member');
            // Add group to user's contact/group list
            window.firebaseDB.ref(`users/${memberId}/contacts/${activeChat.id}`).set({ type: 'group', joinedAt: Date.now() });
            
            alert("Usuário adicionado com sucesso!");

        } catch (error) {
            console.error("Erro ao adicionar membro:", error);
            alert("Erro ao processar solicitação.");
        }
    };
    
    const deleteRole = (roleId) => {
        if (!confirm("Excluir este cargo? Membros voltarão a ser 'Membros'.")) return;
        window.firebaseDB.ref(`groups/${activeChat.id}/roles/${roleId}`).remove();
        // Reset members with this role to 'member'
        members.forEach(m => {
            if (m.roleKey === roleId) {
                assignRole(m.id, 'member');
            }
        });
    };

    const handleEditGroup = () => {
        if (!isAdmin) return;
        const newName = prompt("Novo nome do grupo:", activeChat.name);
        if (newName && newName !== activeChat.name) {
             window.firebaseDB.ref(`groups/${activeChat.id}/name`).set(newName);
        }
    };

    const handleAvatarChange = async (e) => {
        if (!isAdmin || !e.target.files[0]) return;
        
        try {
            const file = e.target.files[0];
            const base64 = await window.compressImage(file, 300, 0.7); // 300px width, 70% jpeg quality
            window.firebaseDB.ref(`groups/${activeChat.id}/avatar`).set(base64);
        } catch (error) {
            console.error("Erro ao processar imagem:", error);
            alert("Erro ao carregar a imagem.");
        }
    };

    return (
        <div className="absolute inset-0 bg-white z-20 flex flex-col animate-slide-in-right">
            <div className="bg-[#f0f2f5] p-4 flex items-center gap-4 shadow-sm shrink-0">
                <button onClick={onClose} className="text-gray-600 hover:bg-gray-200 p-2 rounded-full">
                    <div className="icon-arrow-left"></div>
                </button>
                <h2 className="font-semibold text-gray-800">Dados do Grupo</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="flex flex-col items-center mb-8 relative">
                    <div className="relative group">
                        <img src={activeChat.avatar} className="w-32 h-32 rounded-full mb-4 shadow-md object-cover bg-gray-100" />
                        {isAdmin && (
                            <>
                                <label htmlFor="group-avatar-upload" className="absolute bottom-4 right-0 bg-[#00a884] p-2 rounded-full cursor-pointer hover:bg-[#008f6f] shadow-lg transition-transform hover:scale-110">
                                    <div className="icon-camera text-white text-lg"></div>
                                </label>
                                <input 
                                    id="group-avatar-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleAvatarChange}
                                />
                            </>
                        )}
                    </div>
                    
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        {activeChat.name}
                        {isAdmin && <div className="icon-pencil w-4 h-4 cursor-pointer text-gray-400 hover:text-black" onClick={handleEditGroup} title="Editar Nome"></div>}
                        <div className="text-sm bg-gray-200 px-2 py-0.5 rounded text-gray-600 font-normal">ID: {activeChat.id}</div>
                    </h1>
                    <p className="text-gray-500">Grupo • {members.length} participantes</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex justify-between">
                        <span>Permissões</span>
                        <div className="flex gap-4">
                            {isAdmin && <span className="text-xs text-blue-600 cursor-pointer" onClick={addMember}>+ Add Membro</span>}
                            {isAdmin && <span className="text-xs text-blue-600 cursor-pointer" onClick={createRole}>+ Criar Cargo</span>}
                        </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {Object.entries(permissions).map(([key, value]) => (
                            <div key={key} className="p-4 flex justify-between items-center hover:bg-gray-50">
                                <span className="text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <button 
                                    onClick={() => togglePermission(key)}
                                    disabled={!isAdmin}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors ${value ? 'bg-[#00a884]' : 'bg-gray-300'}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${value ? 'translate-x-6' : ''}`}></div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {/* Role Order: Admin -> Custom Roles -> Members */}
                    {['admin', ...Object.keys(customRoles), 'member'].map(roleKey => {
                        const roleMembers = groupedMembers[roleKey] || [];
                        if (roleMembers.length === 0 && roleKey === 'member') return null; 
                        if (roleMembers.length === 0 && roleKey !== 'admin' && !isAdmin) return null; 

                        const roleName = roleKey === 'admin' ? 'Administradores' : (roleKey === 'member' ? 'Membros' : customRoles[roleKey]?.name);
                        
                        return (
                            <div key={roleKey} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-700 flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        {roleName} 
                                        <span className="text-xs font-normal text-gray-400 bg-white border px-1.5 rounded-full">{roleMembers.length}</span>
                                    </span>
                                    {isAdmin && roleKey !== 'admin' && roleKey !== 'member' && (
                                        <div className="icon-trash text-red-400 cursor-pointer hover:text-red-600 text-sm" onClick={() => deleteRole(roleKey)} title="Excluir Cargo"></div>
                                    )}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {roleMembers.map(m => (
                                        <div key={m.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <img src={m.avatar} className="w-10 h-10 rounded-full object-cover" />
                                                <div>
                                                    <p className="font-medium text-gray-800 flex items-center gap-2">
                                                        {m.name || m.id}
                                                        {m.id === user.id && <span className="text-xs bg-[#00a884] text-white px-1 rounded">Você</span>}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {m.privacy?.publicId !== false ? `ID: ${m.id}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            {isAdmin && m.id !== user.id && (
                                                <div className="relative group">
                                                    <button className="text-gray-400 hover:text-gray-600 p-1"><div className="icon-more-vertical"></div></button>
                                                    <div className="absolute right-0 top-8 hidden group-hover:block bg-white shadow-xl border rounded z-10 w-40 py-1">
                                                        <div className="px-3 py-1 text-xs text-gray-400 uppercase font-bold tracking-wider">Mudar Cargo</div>
                                                        {roleKey !== 'admin' && <button onClick={() => assignRole(m.id, 'admin')} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">Promover a Admin</button>}
                                                        {roleKey !== 'member' && <button onClick={() => assignRole(m.id, 'member')} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">Rebaixar a Membro</button>}
                                                        {Object.entries(customRoles).map(([rId, rData]) => (
                                                            rId !== roleKey && (
                                                                <button key={rId} onClick={() => assignRole(m.id, rId)} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-blue-600 truncate">
                                                                    Mover para {rData.name}
                                                                </button>
                                                            )
                                                        ))}
                                                        <div className="border-t my-1"></div>
                                                        <button className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-500 text-sm">Remover do Grupo</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {roleMembers.length === 0 && <div className="p-4 text-center text-sm text-gray-400 italic">Nenhum usuário neste cargo.</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}