require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("../src/config/database");
const User = require("../src/models/user");

const password = "DemoUser@123";

const demoUsers = [
  {
    firstName: "Aarav",
    lastName: "Mehta",
    emailId: "aarav.frontend.demo@devconnect.test",
    age: 24,
    gender: "male",
    skills: ["React", "TypeScript", "Tailwind CSS", "Redux", "Vite"],
    about:
      "Frontend developer focused on building polished React interfaces, reusable components, and fast product dashboards.",
    primaryField: "Frontend Development",
    relatedFields: ["UI UX Design", "Full Stack Development", "Web Performance"],
  },
  {
    firstName: "Nisha",
    lastName: "Rao",
    emailId: "nisha.fullstack.demo@devconnect.test",
    age: 26,
    gender: "female",
    skills: ["React", "Node.js", "Express", "MongoDB", "REST APIs"],
    about:
      "Full stack developer building MERN apps, API integrations, and user-facing product features from end to end.",
    primaryField: "Full Stack Development",
    relatedFields: ["Frontend Development", "Backend Development", "API Design"],
  },
  {
    firstName: "Kabir",
    lastName: "Singh",
    emailId: "kabir.backend.demo@devconnect.test",
    age: 28,
    gender: "male",
    skills: ["Node.js", "PostgreSQL", "Redis", "Docker", "System Design"],
    about:
      "Backend engineer working on scalable APIs, database design, caching, and reliable service architecture.",
    primaryField: "Backend Development",
    relatedFields: ["Cloud Engineering", "API Design", "DevOps"],
  },
  {
    firstName: "Maya",
    lastName: "Iyer",
    emailId: "maya.ml.demo@devconnect.test",
    age: 27,
    gender: "female",
    skills: ["Python", "TensorFlow", "PyTorch", "Pandas", "Scikit-learn"],
    about:
      "Machine learning engineer experimenting with model training, evaluation, data pipelines, and applied AI products.",
    primaryField: "Machine Learning",
    relatedFields: ["Data Science", "Python Backend", "MLOps"],
  },
  {
    firstName: "Rohan",
    lastName: "Kapoor",
    emailId: "rohan.devops.demo@devconnect.test",
    age: 29,
    gender: "male",
    skills: ["AWS", "Kubernetes", "Docker", "Terraform", "CI/CD"],
    about:
      "DevOps engineer focused on cloud infrastructure, deployment pipelines, observability, and production reliability.",
    primaryField: "DevOps",
    relatedFields: ["Cloud Engineering", "Backend Development", "Site Reliability"],
  },
  {
    firstName: "Ananya",
    lastName: "Shah",
    emailId: "ananya.mobile.demo@devconnect.test",
    age: 25,
    gender: "female",
    skills: ["React Native", "Flutter", "Firebase", "Android", "iOS"],
    about:
      "Mobile developer building cross-platform apps with clean UX, offline support, notifications, and Firebase backends.",
    primaryField: "Mobile Development",
    relatedFields: ["Frontend Development", "UI UX Design", "Backend Development"],
  },
  {
    firstName: "Dev",
    lastName: "Patel",
    emailId: "dev.cyber.demo@devconnect.test",
    age: 30,
    gender: "male",
    skills: ["Network Security", "Burp Suite", "OWASP", "Python", "Linux"],
    about:
      "Cybersecurity engineer interested in application security, vulnerability testing, threat modeling, and secure APIs.",
    primaryField: "Cybersecurity",
    relatedFields: ["Backend Development", "Cloud Engineering", "DevOps"],
  },
  {
    firstName: "Sara",
    lastName: "Khan",
    emailId: "sara.data.demo@devconnect.test",
    age: 26,
    gender: "female",
    skills: ["Python", "SQL", "Pandas", "Tableau", "Statistics"],
    about:
      "Data scientist turning product data into insights, experiments, dashboards, and predictive models.",
    primaryField: "Data Science",
    relatedFields: ["Machine Learning", "Analytics Engineering", "Python Backend"],
  },
  {
    firstName: "Vihaan",
    lastName: "Joshi",
    emailId: "vihaan.cloud.demo@devconnect.test",
    age: 31,
    gender: "male",
    skills: ["AWS", "Azure", "Serverless", "Terraform", "Node.js"],
    about:
      "Cloud engineer designing scalable infrastructure, serverless systems, deployment automation, and cost-aware platforms.",
    primaryField: "Cloud Engineering",
    relatedFields: ["DevOps", "Backend Development", "System Design"],
  },
  {
    firstName: "Ira",
    lastName: "Nair",
    emailId: "ira.uiux.demo@devconnect.test",
    age: 24,
    gender: "female",
    skills: ["Figma", "Design Systems", "React", "Accessibility", "Prototyping"],
    about:
      "UI UX focused engineer who bridges design and frontend implementation with accessible design systems.",
    primaryField: "UI UX Design",
    relatedFields: ["Frontend Development", "Product Design", "Web Accessibility"],
  },
  {
    firstName: "Arjun",
    lastName: "Bose",
    emailId: "arjun.blockchain.demo@devconnect.test",
    age: 27,
    gender: "male",
    skills: ["Solidity", "Ethereum", "Smart Contracts", "Web3.js", "Node.js"],
    about:
      "Blockchain developer building smart contracts, decentralized app backends, and Web3 product experiments.",
    primaryField: "Blockchain",
    relatedFields: ["Backend Development", "Cybersecurity", "Full Stack Development"],
  },
  {
    firstName: "Meera",
    lastName: "Menon",
    emailId: "meera.embedded.demo@devconnect.test",
    age: 29,
    gender: "female",
    skills: ["C", "C++", "RTOS", "IoT", "Microcontrollers"],
    about:
      "Embedded systems developer working on IoT firmware, device communication, real-time systems, and hardware integrations.",
    primaryField: "Embedded Systems",
    relatedFields: ["IoT", "Cloud Engineering", "Backend Development"],
  },
];

const seedDemoUsers = async () => {
  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  const fieldLastAnalyzed = new Date();

  for (const demoUser of demoUsers) {
    await User.findOneAndUpdate(
      { emailId: demoUser.emailId },
      {
        ...demoUser,
        password: passwordHash,
        photoUrl: "",
        isGoogleUser: false,
        fieldLastAnalyzed,
        currentlyWorkingOn: "",
        availableFor: ["project collaboration", "just talking tech"],
        lastActiveAt: new Date(),
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  console.info(`Seeded ${demoUsers.length} demo users.`);
  console.info(`Demo password for all seeded users: ${password}`);
};

seedDemoUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Demo user seed failed:", err.message);
    process.exit(1);
  });
