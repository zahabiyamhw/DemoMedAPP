class DemoMedAPI {
    constructor(url, key) {
        this.api_url = url || 'https://assessment.ksensetech.com/api';
        this.api_key = key;
    }
    async getPatientData(page = 1) {
        try {
            const response = await fetch(`${this.api_url}/patients?limit=10&page=${page}`, {
                headers: {
                    'x-api-key': this.api_key
                }
            });
            const data = { status: response.status, body: await response.json() };
            return data;
        } catch (error) {
            console.error('Error fetching patient data:', error);
            return;
        }
    };
    async postAssessmentResults(riskResults) {
        try {
            const response = await fetch(`${this.api_url}/submit-assessment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.api_key
                },
                body: JSON.stringify(riskResults)
            });
            return { status: response.status, body: await response.json() };
        } catch (error) {
            console.error('Error posting patient risk results:', error);
            return;
        }
    }
}
export default DemoMedAPI;