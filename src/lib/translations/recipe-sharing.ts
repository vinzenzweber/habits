/**
 * Translations for recipe sharing UI text.
 */

export type RecipeSharingTranslations = {
  // Modal titles
  shareRecipe: string;
  manageSharing: string;

  // Share form
  recipientEmail: string;
  searchByEmail: string;
  userNotFound: string;
  cannotShareWithSelf: string;
  canView: string;
  canEdit: string;
  optionalMessage: string;
  shareButton: string;
  cancel: string;

  // Success states
  shareSuccess: string;

  // Manage shares
  sharedWith: string;
  noShares: string;
  removeAccess: string;
  removeAccessConfirm: string;
  permissionUpdated: string;

  // Badges
  sharedByLabel: string;
  sharedLabel: string;
  fromLabel: string;

  // Fork
  fork: string;
  forking: string;
  forkRecipe: string;
  viewMyCopy: string;
  forkSuccess: string;

  // Tabs
  myRecipes: string;
  sharedWithMe: string;

  // Errors
  alreadyShared: string;
  shareError: string;
  failedToLoadShares: string;
  failedToUpdatePermission: string;
  failedToRemoveShare: string;
  failedToFork: string;
};

const translations: Record<string, RecipeSharingTranslations> = {
  'en-US': {
    shareRecipe: 'Share Recipe',
    manageSharing: 'Manage Sharing',
    recipientEmail: 'Email address',
    searchByEmail: 'Enter email address',
    userNotFound: 'No user found with this email',
    cannotShareWithSelf: 'Cannot share with yourself',
    canView: 'Can view',
    canEdit: 'Can edit',
    optionalMessage: 'Add a message (optional)',
    shareButton: 'Share',
    cancel: 'Cancel',
    shareSuccess: 'Recipe shared successfully!',
    sharedWith: 'Shared with',
    noShares: 'Not shared with anyone',
    removeAccess: 'Remove access',
    removeAccessConfirm: 'Are you sure you want to remove access for this person?',
    permissionUpdated: 'Permission updated',
    sharedByLabel: 'Shared by',
    sharedLabel: 'Shared',
    fromLabel: 'From',
    fork: 'Fork',
    forking: 'Forking...',
    forkRecipe: 'Fork Recipe',
    viewMyCopy: 'View My Copy',
    forkSuccess: 'Recipe forked successfully!',
    myRecipes: 'My Recipes',
    sharedWithMe: 'Shared with me',
    alreadyShared: 'Recipe already shared with this user',
    shareError: 'Failed to share recipe',
    failedToLoadShares: 'Failed to load shares',
    failedToUpdatePermission: 'Failed to update permission',
    failedToRemoveShare: 'Failed to remove share',
    failedToFork: 'Failed to fork recipe',
  },
  'de-DE': {
    shareRecipe: 'Rezept teilen',
    manageSharing: 'Freigaben verwalten',
    recipientEmail: 'E-Mail-Adresse',
    searchByEmail: 'E-Mail-Adresse eingeben',
    userNotFound: 'Kein Benutzer mit dieser E-Mail gefunden',
    cannotShareWithSelf: 'Teilen mit sich selbst nicht möglich',
    canView: 'Kann ansehen',
    canEdit: 'Kann bearbeiten',
    optionalMessage: 'Nachricht hinzufügen (optional)',
    shareButton: 'Teilen',
    cancel: 'Abbrechen',
    shareSuccess: 'Rezept erfolgreich geteilt!',
    sharedWith: 'Geteilt mit',
    noShares: 'Mit niemandem geteilt',
    removeAccess: 'Zugriff entfernen',
    removeAccessConfirm: 'Möchtest du den Zugriff für diese Person wirklich entfernen?',
    permissionUpdated: 'Berechtigung aktualisiert',
    sharedByLabel: 'Geteilt von',
    sharedLabel: 'Geteilt',
    fromLabel: 'Von',
    fork: 'Kopieren',
    forking: 'Wird kopiert...',
    forkRecipe: 'Rezept kopieren',
    viewMyCopy: 'Meine Kopie ansehen',
    forkSuccess: 'Rezept erfolgreich kopiert!',
    myRecipes: 'Meine Rezepte',
    sharedWithMe: 'Mit mir geteilt',
    alreadyShared: 'Rezept bereits mit diesem Benutzer geteilt',
    shareError: 'Rezept konnte nicht geteilt werden',
    failedToLoadShares: 'Freigaben konnten nicht geladen werden',
    failedToUpdatePermission: 'Berechtigung konnte nicht aktualisiert werden',
    failedToRemoveShare: 'Freigabe konnte nicht entfernt werden',
    failedToFork: 'Rezept konnte nicht kopiert werden',
  },
  'fr-FR': {
    shareRecipe: 'Partager la recette',
    manageSharing: 'Gérer le partage',
    recipientEmail: 'Adresse e-mail',
    searchByEmail: 'Entrez l\'adresse e-mail',
    userNotFound: 'Aucun utilisateur trouvé avec cet e-mail',
    cannotShareWithSelf: 'Impossible de partager avec vous-même',
    canView: 'Peut voir',
    canEdit: 'Peut modifier',
    optionalMessage: 'Ajouter un message (optionnel)',
    shareButton: 'Partager',
    cancel: 'Annuler',
    shareSuccess: 'Recette partagée avec succès !',
    sharedWith: 'Partagé avec',
    noShares: 'Partagé avec personne',
    removeAccess: 'Supprimer l\'accès',
    removeAccessConfirm: 'Êtes-vous sûr de vouloir supprimer l\'accès pour cette personne ?',
    permissionUpdated: 'Permission mise à jour',
    sharedByLabel: 'Partagé par',
    sharedLabel: 'Partagé',
    fromLabel: 'De',
    fork: 'Copier',
    forking: 'Copie en cours...',
    forkRecipe: 'Copier la recette',
    viewMyCopy: 'Voir ma copie',
    forkSuccess: 'Recette copiée avec succès !',
    myRecipes: 'Mes recettes',
    sharedWithMe: 'Partagées avec moi',
    alreadyShared: 'Recette déjà partagée avec cet utilisateur',
    shareError: 'Échec du partage de la recette',
    failedToLoadShares: 'Échec du chargement des partages',
    failedToUpdatePermission: 'Échec de la mise à jour des permissions',
    failedToRemoveShare: 'Échec de la suppression du partage',
    failedToFork: 'Échec de la copie de la recette',
  },
  'es-ES': {
    shareRecipe: 'Compartir receta',
    manageSharing: 'Gestionar compartir',
    recipientEmail: 'Correo electrónico',
    searchByEmail: 'Ingresa el correo electrónico',
    userNotFound: 'No se encontró usuario con este correo',
    cannotShareWithSelf: 'No puedes compartir contigo mismo',
    canView: 'Puede ver',
    canEdit: 'Puede editar',
    optionalMessage: 'Añadir mensaje (opcional)',
    shareButton: 'Compartir',
    cancel: 'Cancelar',
    shareSuccess: '¡Receta compartida con éxito!',
    sharedWith: 'Compartido con',
    noShares: 'No compartido con nadie',
    removeAccess: 'Quitar acceso',
    removeAccessConfirm: '¿Estás seguro de que quieres quitar el acceso a esta persona?',
    permissionUpdated: 'Permiso actualizado',
    sharedByLabel: 'Compartido por',
    sharedLabel: 'Compartido',
    fromLabel: 'De',
    fork: 'Copiar',
    forking: 'Copiando...',
    forkRecipe: 'Copiar receta',
    viewMyCopy: 'Ver mi copia',
    forkSuccess: '¡Receta copiada con éxito!',
    myRecipes: 'Mis recetas',
    sharedWithMe: 'Compartidas conmigo',
    alreadyShared: 'Receta ya compartida con este usuario',
    shareError: 'Error al compartir la receta',
    failedToLoadShares: 'Error al cargar los compartidos',
    failedToUpdatePermission: 'Error al actualizar el permiso',
    failedToRemoveShare: 'Error al eliminar el acceso compartido',
    failedToFork: 'Error al copiar la receta',
  },
  'it-IT': {
    shareRecipe: 'Condividi ricetta',
    manageSharing: 'Gestisci condivisione',
    recipientEmail: 'Indirizzo e-mail',
    searchByEmail: 'Inserisci l\'indirizzo e-mail',
    userNotFound: 'Nessun utente trovato con questa e-mail',
    cannotShareWithSelf: 'Non puoi condividere con te stesso',
    canView: 'Può visualizzare',
    canEdit: 'Può modificare',
    optionalMessage: 'Aggiungi un messaggio (opzionale)',
    shareButton: 'Condividi',
    cancel: 'Annulla',
    shareSuccess: 'Ricetta condivisa con successo!',
    sharedWith: 'Condiviso con',
    noShares: 'Non condiviso con nessuno',
    removeAccess: 'Rimuovi accesso',
    removeAccessConfirm: 'Sei sicuro di voler rimuovere l\'accesso per questa persona?',
    permissionUpdated: 'Permesso aggiornato',
    sharedByLabel: 'Condiviso da',
    sharedLabel: 'Condiviso',
    fromLabel: 'Da',
    fork: 'Copia',
    forking: 'Copiando...',
    forkRecipe: 'Copia ricetta',
    viewMyCopy: 'Vedi la mia copia',
    forkSuccess: 'Ricetta copiata con successo!',
    myRecipes: 'Le mie ricette',
    sharedWithMe: 'Condivise con me',
    alreadyShared: 'Ricetta già condivisa con questo utente',
    shareError: 'Impossibile condividere la ricetta',
    failedToLoadShares: 'Impossibile caricare le condivisioni',
    failedToUpdatePermission: 'Impossibile aggiornare il permesso',
    failedToRemoveShare: 'Impossibile rimuovere la condivisione',
    failedToFork: 'Impossibile copiare la ricetta',
  },
  'nl-NL': {
    shareRecipe: 'Recept delen',
    manageSharing: 'Delen beheren',
    recipientEmail: 'E-mailadres',
    searchByEmail: 'Voer e-mailadres in',
    userNotFound: 'Geen gebruiker gevonden met dit e-mailadres',
    cannotShareWithSelf: 'Kan niet met jezelf delen',
    canView: 'Kan bekijken',
    canEdit: 'Kan bewerken',
    optionalMessage: 'Bericht toevoegen (optioneel)',
    shareButton: 'Delen',
    cancel: 'Annuleren',
    shareSuccess: 'Recept succesvol gedeeld!',
    sharedWith: 'Gedeeld met',
    noShares: 'Met niemand gedeeld',
    removeAccess: 'Toegang verwijderen',
    removeAccessConfirm: 'Weet je zeker dat je de toegang voor deze persoon wilt verwijderen?',
    permissionUpdated: 'Toestemming bijgewerkt',
    sharedByLabel: 'Gedeeld door',
    sharedLabel: 'Gedeeld',
    fromLabel: 'Van',
    fork: 'Kopiëren',
    forking: 'Kopiëren...',
    forkRecipe: 'Recept kopiëren',
    viewMyCopy: 'Mijn kopie bekijken',
    forkSuccess: 'Recept succesvol gekopieerd!',
    myRecipes: 'Mijn recepten',
    sharedWithMe: 'Met mij gedeeld',
    alreadyShared: 'Recept al gedeeld met deze gebruiker',
    shareError: 'Kan recept niet delen',
    failedToLoadShares: 'Kan gedeelde recepten niet laden',
    failedToUpdatePermission: 'Kan toestemming niet bijwerken',
    failedToRemoveShare: 'Kan delen niet verwijderen',
    failedToFork: 'Kan recept niet kopiëren',
  },
  'pt-BR': {
    shareRecipe: 'Compartilhar receita',
    manageSharing: 'Gerenciar compartilhamento',
    recipientEmail: 'Endereço de e-mail',
    searchByEmail: 'Digite o endereço de e-mail',
    userNotFound: 'Nenhum usuário encontrado com este e-mail',
    cannotShareWithSelf: 'Não é possível compartilhar consigo mesmo',
    canView: 'Pode ver',
    canEdit: 'Pode editar',
    optionalMessage: 'Adicionar mensagem (opcional)',
    shareButton: 'Compartilhar',
    cancel: 'Cancelar',
    shareSuccess: 'Receita compartilhada com sucesso!',
    sharedWith: 'Compartilhado com',
    noShares: 'Não compartilhado com ninguém',
    removeAccess: 'Remover acesso',
    removeAccessConfirm: 'Tem certeza de que deseja remover o acesso desta pessoa?',
    permissionUpdated: 'Permissão atualizada',
    sharedByLabel: 'Compartilhado por',
    sharedLabel: 'Compartilhado',
    fromLabel: 'De',
    fork: 'Copiar',
    forking: 'Copiando...',
    forkRecipe: 'Copiar receita',
    viewMyCopy: 'Ver minha cópia',
    forkSuccess: 'Receita copiada com sucesso!',
    myRecipes: 'Minhas receitas',
    sharedWithMe: 'Compartilhadas comigo',
    alreadyShared: 'Receita já compartilhada com este usuário',
    shareError: 'Falha ao compartilhar receita',
    failedToLoadShares: 'Falha ao carregar compartilhamentos',
    failedToUpdatePermission: 'Falha ao atualizar permissão',
    failedToRemoveShare: 'Falha ao remover compartilhamento',
    failedToFork: 'Falha ao copiar receita',
  },
  'ja-JP': {
    shareRecipe: 'レシピを共有',
    manageSharing: '共有を管理',
    recipientEmail: 'メールアドレス',
    searchByEmail: 'メールアドレスを入力',
    userNotFound: 'このメールアドレスのユーザーが見つかりません',
    cannotShareWithSelf: '自分自身とは共有できません',
    canView: '閲覧可能',
    canEdit: '編集可能',
    optionalMessage: 'メッセージを追加（任意）',
    shareButton: '共有',
    cancel: 'キャンセル',
    shareSuccess: 'レシピが正常に共有されました！',
    sharedWith: '共有先',
    noShares: '誰とも共有されていません',
    removeAccess: 'アクセスを削除',
    removeAccessConfirm: 'この人のアクセスを削除してもよろしいですか？',
    permissionUpdated: '権限が更新されました',
    sharedByLabel: '共有元',
    sharedLabel: '共有済み',
    fromLabel: '送信者',
    fork: 'コピー',
    forking: 'コピー中...',
    forkRecipe: 'レシピをコピー',
    viewMyCopy: '自分のコピーを見る',
    forkSuccess: 'レシピが正常にコピーされました！',
    myRecipes: '自分のレシピ',
    sharedWithMe: '共有されたレシピ',
    alreadyShared: 'このユーザーとは既に共有されています',
    shareError: 'レシピの共有に失敗しました',
    failedToLoadShares: '共有の読み込みに失敗しました',
    failedToUpdatePermission: '権限の更新に失敗しました',
    failedToRemoveShare: '共有の削除に失敗しました',
    failedToFork: 'レシピのコピーに失敗しました',
  },
  'zh-CN': {
    shareRecipe: '分享食谱',
    manageSharing: '管理分享',
    recipientEmail: '电子邮箱',
    searchByEmail: '输入电子邮箱地址',
    userNotFound: '未找到使用此邮箱的用户',
    cannotShareWithSelf: '不能与自己分享',
    canView: '可以查看',
    canEdit: '可以编辑',
    optionalMessage: '添加留言（可选）',
    shareButton: '分享',
    cancel: '取消',
    shareSuccess: '食谱分享成功！',
    sharedWith: '已分享给',
    noShares: '未分享给任何人',
    removeAccess: '移除访问权限',
    removeAccessConfirm: '确定要移除此人的访问权限吗？',
    permissionUpdated: '权限已更新',
    sharedByLabel: '分享自',
    sharedLabel: '已分享',
    fromLabel: '来自',
    fork: '复制',
    forking: '正在复制...',
    forkRecipe: '复制食谱',
    viewMyCopy: '查看我的副本',
    forkSuccess: '食谱复制成功！',
    myRecipes: '我的食谱',
    sharedWithMe: '分享给我的',
    alreadyShared: '食谱已分享给此用户',
    shareError: '分享食谱失败',
    failedToLoadShares: '加载分享列表失败',
    failedToUpdatePermission: '更新权限失败',
    failedToRemoveShare: '删除分享失败',
    failedToFork: '复制食谱失败',
  },
};

// Mapping for locale variants to their base locale
const localeVariantMap: Record<string, string> = {
  'en-GB': 'en-US',
  'de-AT': 'de-DE',
  'de-CH': 'de-DE',
};

/**
 * Get translations for recipe sharing based on user locale.
 * Falls back to English (en-US) for unsupported locales.
 */
export function getRecipeSharingTranslations(locale: string): RecipeSharingTranslations {
  // Check for locale variant mapping
  const baseLocale = localeVariantMap[locale] ?? locale;

  // Return translations for the locale, falling back to English
  return translations[baseLocale] ?? translations['en-US'];
}
