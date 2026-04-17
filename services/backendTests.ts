import { BackendAPI } from './backend';

// Test de connexion au backend
export const testBackendConnection = async () => {
  try {
    console.log('🔄 Test de connexion au backend...');
    const health = await BackendAPI.getHealth();
    console.log('✅ Backend connecté!', health);
    return true;
  } catch (error) {
    console.error('❌ Erreur connexion backend:', error);
    return false;
  }
};

// Test création d'étudiant
export const testCreateStudent = async () => {
  try {
    console.log('🔄 Test création étudiant...');
    // Créer d'abord un utilisateur via l'API d'auth/inscription
    const random = Math.floor(Math.random() * 100000);
    const email = `test.user+${random}@example.com`;
    const registerResp = await BackendAPI.auth.register({
      email,
      password: 'TempPass123!',
      full_name: `Test User ${random}`,
      role: 'student',
      school_id: 1
    });

    if (!registerResp || !registerResp.user || !registerResp.user.id) {
      console.error('❌ Échec création utilisateur pour test:', registerResp);
      return null;
    }

    const userId = registerResp.user.id;

    const student = await BackendAPI.students.create({
      user_id: userId,
      matricule: `TEST-${random}`,
      school_id: 1,
      class_name: 'A'
    });

    console.log('✅ Étudiant créé:', student);
    return student;
  } catch (error) {
    console.error('❌ Erreur création étudiant:', error);
    return null;
  }
};

// Test liste d'étudiants
export const testListStudents = async () => {
  try {
    console.log('🔄 Récupération des étudiants...');
    const students = await BackendAPI.students.list();
    console.log('✅ Étudiants récupérés:', students);
    return students;
  } catch (error) {
    console.error('❌ Erreur récupération:', error);
    return [];
  }
};

// Exécuter tous les tests
export const runAllTests = async () => {
  console.log('\n========== TESTS BACKEND ==========\n');
  
  const isConnected = await testBackendConnection();
  if (!isConnected) {
    console.error('❌ Impossible de se connecter au backend!');
    return;
  }

  await testListStudents();
  await testCreateStudent();
  await testListStudents();

  console.log('\n========== FIN TESTS ==========\n');
};
