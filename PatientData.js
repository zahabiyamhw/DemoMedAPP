import DemoMedAPI from './DemoMedAPI.js';
import { API_KEY, BASE_URL } from './config.js';

const calculateBPRisk = (patient) => {
    if (patient.blood_pressure === undefined || patient.blood_pressure.trim() === '') {
        return -1;
    }

    const match = patient.blood_pressure.trim().match(/^(\d+)\s*\/\s*(\d+)$/);     // Making sure blood_pressure is in the format "systolic/diastolic"
    if (match) {
        var bp_systolic = parseInt(match[1], 10);
        var bp_diastolic = parseInt(match[2], 10);
    } else {
        return -1;
    }

    let bp_risk = 0;
    if (bp_systolic < 120 && bp_diastolic < 80) {
        bp_risk = 0;
    }
    if ((bp_systolic >= 120 && bp_systolic <= 129) && bp_diastolic < 80) {
        bp_risk = 1;
    }
    if ((bp_systolic >= 130 && bp_systolic <= 139) || (bp_diastolic >= 80 && bp_diastolic <= 89)) {
        bp_risk = 2;
    }
    if (bp_systolic >= 140 || bp_diastolic >= 90) {
        bp_risk = 3;
    }
    return bp_risk;
}

const calculateTemperatureRisk = (patient) => {
    if (patient.temperature === undefined || isNaN(patient.temperature)) {
        return -1;
    }

    let temperature = parseFloat(patient.temperature);
    let temp_risk = 0;
    if (temperature <= 99.5) {
        temp_risk = 0;
    } else if (temperature >= 99.6 && temperature <= 100.9) {
        temp_risk = 1;
    } else if (temperature >= 101.0) {
        temp_risk = 2;
    }
    return temp_risk;
}

const calculateAgeRisk = (patient) => {
    if (patient.age === undefined || patient.age == null || isNaN(patient.age) || patient.age <= 0) {
        return -1;
    }
    let age = parseInt(patient.age);
    let age_risk = 0;
    if (age < 40) {
        age_risk = 0;
    } else if (age >= 40 && age < 65) {
        age_risk = 1;
    } else {
        age_risk = 2;
    }
    return age_risk;
}

const calculateRisk = (patient) => {
    let data_quality_issues = false;
    let total_risk = 0;

    let bp_risk = calculateBPRisk(patient);
    if (bp_risk === -1) {
        data_quality_issues = true;
    } else {
        total_risk += bp_risk;
    }

    let temp_risk = calculateTemperatureRisk(patient);
    if (temp_risk === -1) {
        data_quality_issues = true;
    } else {
        total_risk += temp_risk;
    }

    let age_risk = calculateAgeRisk(patient);
    if (age_risk === -1) {
        data_quality_issues = true;
    } else {
        total_risk += age_risk;
    }

    let risk = false;
    let fever = false;
    if (total_risk >= 4) {
        risk = true;
    }
    if (temp_risk > 0) {
        fever = true;
    }
    return { risk: risk, fever: fever, data_quality_issues: data_quality_issues };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getPatientData = async (pd_obj) => {
    let pd_arr = [];
    let page = 1;

    while (true) {
        try {
            let response = await pd_obj.getPatientData(page);
            if (response.status == 200) {
                pd_arr = pd_arr.concat(response.body.data);
                if (response.body.pagination.hasNext) {
                    page += 1;
                    continue;
                } else {
                    break;
                }
            } else {
                await sleep(10000);
                continue;
            }
        } catch (error) {
            await sleep(10000);
            continue;
        }
    }
    return pd_arr;
}

const postAssessmentResults = async (pd_obj, results) => {
    const post_response = await pd_obj.postAssessmentResults(results);
    if (post_response.status === 200) {
        console.log('Assessment results posted successfully.', post_response.body);
    }
    else {
        console.error('Failed to post assessment results. Status:', post_response);
    }
}

(async () => {
    const pd_obj = new DemoMedAPI(BASE_URL, API_KEY);

    // Fetch patient data
    const pd_arr = await getPatientData(pd_obj);
    if (pd_arr.length === 0) {
        console.log('No patient data found.');
        return;
    }

    // Process patient data and calculate risks
    let high_risk_patients = [];
    let fever_patients = [];
    let data_quality_issues = [];

    for (let patient of pd_arr) {
        if (patient) {
            var risk_data = calculateRisk(patient);

            if (risk_data.data_quality_issues) {
                data_quality_issues.push(patient.patient_id);
            }
            if (risk_data.risk) {
                high_risk_patients.push(patient.patient_id);
            }
            if (risk_data.fever) {
                fever_patients.push(patient.patient_id);
            }
        }
    }
    const results = {
        high_risk_patients: high_risk_patients,
        fever_patients: fever_patients,
        data_quality_issues: data_quality_issues
    };

    // Post the assessment results
    await postAssessmentResults(pd_obj, results);
})();