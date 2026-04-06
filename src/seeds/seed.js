import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Case from '../models/Case.js';

dotenv.config();

const DEFAULT_PASSWORD = 'Password@123';

const USERS = [
    { name: 'Admin User', email: 'admin@caseledger.org', role: 'ADMIN' },
    { name: 'Amnesty Lanka', email: 'amnesty@caseledger.org', role: 'NGO', organizationName: 'Amnesty International Lanka' },
    { name: 'Rights Watch LK', email: 'rights@caseledger.org', role: 'NGO', organizationName: 'Rights Watch Lanka' },
    {
        name: 'Saman Perera', email: 'saman.p@caseledger.org', role: 'INVESTIGATOR',
        nic: '198512345678', dob: new Date('1985-04-15'), phoneNumber: '0771234567',
    },
    {
        name: 'Nimali Fernando', email: 'nimali.f@caseledger.org', role: 'INVESTIGATOR',
        nic: '199203456789', dob: new Date('1992-07-22'), phoneNumber: '0779876543',
    },
    {
        name: 'Kasun Silva', email: 'kasun.s@caseledger.org', role: 'INVESTIGATOR',
        nic: '198809876543', dob: new Date('1988-11-30'), phoneNumber: '0762345678',
    },
    { name: 'Priya Rajapaksa', email: 'priya.r@caseledger.org', role: 'VICTIM', phoneNumber: '0701234567' },
    { name: 'Tharaka Wijesinghe', email: 'tharaka.w@caseledger.org', role: 'VICTIM', phoneNumber: '0712345678' },
    { name: 'Chamari Bandara', email: 'chamari.b@caseledger.org', role: 'VICTIM', phoneNumber: '0723456789' },
    { name: 'Nuwan Dissanayake', email: 'nuwan.d@caseledger.org', role: 'VICTIM', phoneNumber: '0734567890' },
];

const CASES_DATA = [
    {
        title: 'Unlawful Detention at Welikade Prison',
        description: 'A suspect was held for 72 hours without formal charges being filed.',
        category: 'UNLAWFUL_DETENTION',
        priority: 'HIGH',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2024-11-15'),
        location: 'Welikade, Colombo',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Police Brutality During Protest',
        description: 'Protesters were subjected to excessive force during a peaceful demonstration.',
        category: 'CUSTODIAL_VIOLENCE',
        priority: 'CRITICAL',
        status: 'EVIDENCE_COLLECTED',
        incidentDate: new Date('2024-10-08'),
        location: 'Galle Face Green, Colombo',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Journalist Arrested for Critical Article',
        description: 'A journalist was arrested under the PTA for publishing critical articles.',
        category: 'FREEDOM_OF_EXPRESSION',
        priority: 'HIGH',
        status: 'REPORTED',
        incidentDate: new Date('2024-12-01'),
        location: 'Kandy, Central Province',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Migrant Worker Wage Theft',
        description: 'A group of migrant workers were denied wages for 3 months.',
        category: 'LABOR_RIGHTS',
        priority: 'MEDIUM',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2024-09-20'),
        location: 'Free Trade Zone, Katunayake',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Ethnic Discrimination in Employment',
        description: 'Tamil applicants were systematically rejected from government positions.',
        category: 'DISCRIMINATION',
        priority: 'MEDIUM',
        status: 'REPORTED',
        incidentDate: new Date('2024-08-14'),
        location: 'Colombo 07',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Forced Eviction Without Notice',
        description: 'Families were forcibly evicted from their homes without proper legal notice.',
        category: 'OTHER',
        priority: 'HIGH',
        status: 'RESOLVED',
        incidentDate: new Date('2024-06-30'),
        location: 'Trincomalee',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Child Labour in Plantation Sector',
        description: 'Children under 14 were found working in tea plantations during school hours.',
        category: 'LABOR_RIGHTS',
        priority: 'CRITICAL',
        status: 'EVIDENCE_COLLECTED',
        incidentDate: new Date('2024-07-05'),
        location: 'Nuwara Eliya',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Enforced Disappearance Investigation',
        description: 'A family reports their son went missing after being taken by unidentified individuals.',
        category: 'UNLAWFUL_DETENTION',
        priority: 'CRITICAL',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2024-05-17'),
        location: 'Jaffna',
        confidentialLevel: 'CONFIDENTIAL',
    },
    {
        title: 'Torture Allegations Against Police Officers',
        description: 'Multiple detainees allege physical and psychological torture at a police station.',
        category: 'CUSTODIAL_VIOLENCE',
        priority: 'CRITICAL',
        status: 'EVIDENCE_COLLECTED',
        incidentDate: new Date('2024-04-22'),
        location: 'Negombo',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Social Media Censorship Case',
        description: 'A blogger had content removed and account suspended without due process.',
        category: 'FREEDOM_OF_EXPRESSION',
        priority: 'LOW',
        status: 'CLOSED',
        incidentDate: new Date('2024-03-10'),
        location: 'Online — Sri Lanka',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Hate Speech Against Muslim Community',
        description: 'Inflammatory speeches led to targeted vandalism of mosque properties.',
        category: 'DISCRIMINATION',
        priority: 'HIGH',
        status: 'REPORTED',
        incidentDate: new Date('2025-01-03'),
        location: 'Aluthgama',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Land Grab by State Entity',
        description: 'State-affiliated entity seized agricultural land without compensation.',
        category: 'OTHER',
        priority: 'MEDIUM',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2024-11-28'),
        location: 'Mullaitivu',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Prison Overcrowding and Inhumane Conditions',
        description: 'Inmates report severe overcrowding, denial of medical care, and violence.',
        category: 'CUSTODIAL_VIOLENCE',
        priority: 'HIGH',
        status: 'EVIDENCE_COLLECTED',
        incidentDate: new Date('2024-10-15'),
        location: 'Mahara Prison, Gampaha',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Domestic Worker Trafficking Allegation',
        description: 'Domestic workers recruited abroad and subjected to forced labour conditions.',
        category: 'LABOR_RIGHTS',
        priority: 'CRITICAL',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2024-12-20'),
        location: 'Colombo, Western Province',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Student Protest Leaders Arrested',
        description: 'University student leaders detained following protests against academic policies.',
        category: 'FREEDOM_OF_EXPRESSION',
        priority: 'MEDIUM',
        status: 'RESOLVED',
        incidentDate: new Date('2024-09-05'),
        location: 'University of Colombo',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Religious Minority Targeted in Employment',
        description: 'Christian employees face systematic exclusion from promotions.',
        category: 'DISCRIMINATION',
        priority: 'LOW',
        status: 'REPORTED',
        incidentDate: new Date('2025-01-10'),
        location: 'Gampaha District',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Street Vendor Harassment by Municipal Officers',
        description: 'Municipal officers confiscated vendor goods without legal authority.',
        category: 'OTHER',
        priority: 'LOW',
        status: 'CLOSED',
        incidentDate: new Date('2024-08-30'),
        location: 'Pettah, Colombo',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Wrongful Arrest of Opposition Politician',
        description: 'Opposition MP arrested on fabricated charges ahead of local elections.',
        category: 'UNLAWFUL_DETENTION',
        priority: 'CRITICAL',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2025-02-14'),
        location: 'Kurunegala',
        confidentialLevel: 'PUBLIC',
    },
    {
        title: 'Factory Workers Union Busting',
        description: 'Factory management threatened and dismissed union organizers.',
        category: 'LABOR_RIGHTS',
        priority: 'MEDIUM',
        status: 'EVIDENCE_COLLECTED',
        incidentDate: new Date('2024-07-19'),
        location: 'Biyagama Export Processing Zone',
        confidentialLevel: 'INTERNAL',
    },
    {
        title: 'Disappearance of Environmental Activist',
        description: 'Activist documenting illegal sand mining went missing after receiving threats.',
        category: 'OTHER',
        priority: 'HIGH',
        status: 'UNDER_INVESTIGATION',
        incidentDate: new Date('2025-03-01'),
        location: 'Kalutara District',
        confidentialLevel: 'CONFIDENTIAL',
    },
];

const seed = async () => {
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Case.deleteMany({});
    console.log('Cleared existing users and cases');

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    // Create users
    const createdUsers = await User.insertMany(
        USERS.map((u) => ({ ...u, password: hashedPassword }))
    );
    console.log(`Created ${createdUsers.length} users`);

    const adminUser = createdUsers.find((u) => u.role === 'ADMIN');
    const ngoUsers = createdUsers.filter((u) => u.role === 'NGO');
    const investigators = createdUsers.filter((u) => u.role === 'INVESTIGATOR');
    const victims = createdUsers.filter((u) => u.role === 'VICTIM');

    // Create cases
    const caseDocs = CASES_DATA.map((c, idx) => ({
        ...c,
        reportedBy: ngoUsers[idx % ngoUsers.length]._id,
        assignedInvestigator: investigators[idx % investigators.length]._id,
        victim: idx < victims.length ? victims[idx]._id : undefined,
    }));

    const createdCases = [];
    for (const caseData of caseDocs) {
        const created = await Case.create(caseData);
        createdCases.push(created);
    }
    console.log(`Created ${createdCases.length} cases`);

    console.log('\nSeed completed successfully!');
    console.log(`Default password for all users: ${DEFAULT_PASSWORD}`);
    console.log('\nUser credentials:');
    createdUsers.forEach((u) => console.log(`  ${u.role}: ${u.email}`));

    await mongoose.disconnect();
};

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
