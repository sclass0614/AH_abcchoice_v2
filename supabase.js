const SUPABASE_URL = "https://dfomeijvzayyszisqflo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmb21laWp2emF5eXN6aXNxZmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4NjYwNDIsImV4cCI6MjA2MDQ0MjA0Mn0.-r1iL04wvPNdBeIvgxqXLF2rWqIUX5Ot-qGQRdYo_qk";

let supabaseClient = null;

function initSupabase() {
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

window.supabase = initSupabase();

async function createClient() {
  if (!supabaseClient && !window.supabase) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4';
      script.onload = () => {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        resolve(supabaseClient);
      };
      script.onerror = () => {
        reject(new Error('Supabase 클라이언트 라이브러리 로드 실패'));
      };
      document.head.appendChild(script);
    });
  }
  
  if (!supabaseClient && window.supabase) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

async function getselectedMemberData(selectedDate) {
  try {
    const client = await initSupabase();

    const { data, error } = await client
      .from('membersinfo')
      .select('회원번호, 회원명, 생년월일, 입소일, 퇴소일')
      .neq('회원번호', '상담회원')
      .lte('입소일', selectedDate)
      .gte('퇴소일', selectedDate);

    if (error) throw error;

    return data;
  } catch (error) {
    return [];
  }
}

async function getselectedPlanData(selectedDate) {
  try {
    const client = await initSupabase();

    const { data, error } = await client
      .from('activities_plan')
      .select('*')
      .eq('날짜', selectedDate);

    if (error) throw error;

    return data;
  } catch (error) {
    return [];
  }
}

async function getselectedClassData(selectedDate) {
  try {
    const client = await initSupabase();

    const { data, error } = await client
      .from('activities_choice')
      .select('*')
      .eq('날짜', selectedDate);

    if (error) throw error;

    return data;
  } catch (error) {
    return [];
  }
}

async function getTableStructure(tableName) {
  try {
    const client = await initSupabase();

    const { data, error } = await client
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      return Object.keys(data[0]);
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

async function checkColumns() {
  await getTableStructure('activities_choice');
  await getTableStructure('activities_plan');
  await getTableStructure('membersinfo');
}

async function appendClassrowFixed(rowsData) {
  try {
    if (!rowsData || !Array.isArray(rowsData) || rowsData.length === 0) {
      return {
        success: false,
        message: "추가할 데이터가 없습니다."
      };
    }

    const client = await initSupabase();

    const memberNumber = rowsData[0][10];
    const dateValue = rowsData[0][2];

    const { error: deleteError } = await client
      .from('activities_choice')
      .delete()
      .eq('회원번호', memberNumber)
      .eq('날짜', dateValue);

    if (deleteError) throw deleteError;

    const newRowsObjects = rowsData.map(row => {
      return {
        계획_id: row[1],
        날짜: parseInt(row[2]),
        차수: row[3],
        시작시간: row[4],
        종료시간: row[5],
        직원번호: row[6],
        직원명: row[7],
        활동명: row[8],
        생활영역: row[9],
        회원번호: row[10],
        회원명: row[11],
        생년월일: parseInt(row[12])
      };
    });

    const { error: insertError } = await client
      .from('activities_choice')
      .insert(newRowsObjects);

    if (insertError) {
      throw insertError;
    }

    return {
      success: true,
      message: `${rowsData.length}개의 활동 신청 데이터가 추가되었습니다.`,
      addedRows: rowsData.length
    };
  } catch (error) {
    return {
      success: false,
      message: `오류가 발생했습니다: ${error.message}`,
      error: error.toString()
    };
  }
}

async function cancelAllClasses(memberNumber, dateValue) {
  try {
    const client = await initSupabase();

    const { data: deletedData, error } = await client
      .from('activities_choice')
      .delete()
      .eq('회원번호', memberNumber)
      .eq('날짜', dateValue)
      .select();

    if (error) throw error;

    const deletedCount = deletedData ? deletedData.length : 0;

    return {
      success: true,
      message: deletedCount > 0
        ? `${deletedCount}개의 활동 신청이 취소되었습니다.`
        : "취소할 활동 신청이 없습니다.",
      deletedCount: deletedCount
    };
  } catch (error) {
    return {
      success: false,
      message: `오류가 발생했습니다: ${error.message}`,
      error: error.toString()
    };
  }
}

async function appendClassrowWithVariations(rowsData) {
  try {
    if (!rowsData || !Array.isArray(rowsData) || rowsData.length === 0) {
      return {
        success: false,
        message: "추가할 데이터가 없습니다."
      };
    }

    const client = await initSupabase();

    await getTableStructure('activities_choice');

    const memberNumber = rowsData[0][10];
    const dateValue = rowsData[0][2];

    const { error: deleteError } = await client
      .from('activities_choice')
      .delete()
      .eq('회원번호', memberNumber)
      .eq('날짜', dateValue);

    if (deleteError) throw deleteError;

    const newRowsObjects = rowsData.map(row => {
      const obj = {
        계획_id: row[1],
        날짜: parseInt(row[2]),
        차수: row[3],
        시작시간: row[4],
        종료시간: row[5],
        직원번호: row[6],
        직원명: row[7],
        활동명: row[8],
        생활영역: row[9],
        회원번호: row[10],
        회원명: row[11],
        생년월일: parseInt(row[12])
      };

      return obj;
    });

    const { error: insertError } = await client
      .from('activities_choice')
      .insert(newRowsObjects);

    if (insertError) {
      throw insertError;
    }

    return {
      success: true,
      message: `${rowsData.length}개의 활동 신청 데이터가 추가되었습니다.`,
      addedRows: rowsData.length
    };
  } catch (error) {
    return {
      success: false,
      message: `오류가 발생했습니다: ${error.message}`,
      error: error.toString()
    };
  }
}

async function appendClassrow(rowsData) {
  try {
    const columns = await getTableStructure('activities_choice');

    const hasInstructorColumn = columns.includes('직원명');

    if (!hasInstructorColumn) {
      return await appendClassrowWithVariations(rowsData);
    } else {
      return await appendClassrowFixed(rowsData);
    }
  } catch (error) {
    return await appendClassrowFixed(rowsData);
  }
}