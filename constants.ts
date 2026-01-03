import { Resource, Category } from "./types";

export const HYDERABAD_COLLEGES = [
  "Koneru Lakshmaiah University (KLU)",
  "IIT Hyderabad (IITH)",
  "BITS Pilani - Hyderabad Campus",
  "Chaitanya Bharathi Institute of Technology (CBIT)",
  "Jawaharlal Nehru Technological University (JNTUH)",
  "Osmania University (OU)",
  "Vasavi College of Engineering",
  "VNR Vignana Jyothi Institute of Engineering & Technology",
  "Mahatma Gandhi Institute of Technology (MGIT)",
  "Gokaraju Rangaraju Institute of Engineering & Technology (GRIET)",
  "MVSR Engineering College",
];

export const CATEGORIES: Category[] = [
  "Books",
  "Notes",
  "Lab Equipment",
  "Electronics",
  "Others",
];

export const INITIAL_RESOURCES: Resource[] = [
  {
    id: "1",
    title: "Advanced Engineering Mathematics - RK Jain",
    description: "Third edition book, great condition for M1 and M2 semesters.",
    category: "Books",
    ownerId: "user_1",
    ownerName: "Arjun Reddy",
    college: "CBIT",
    status: "available",
    imageUrl: "https://picsum.photos/seed/math/400/300",
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "2",
    title: "Digital Logic Design Lab Kit",
    description: "Breadboard, ICs, and jumper wires for DLD lab experiments.",
    category: "Lab Equipment",
    ownerId: "user_2",
    ownerName: "Sravani K.",
    college: "VNR VJIET",
    status: "available",
    imageUrl: "https://picsum.photos/seed/lab/400/300",
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "3",
    title: "Machine Learning Semester Notes",
    description:
      "Handwritten notes covering Linear Regression to Neural Networks. Very detailed.",
    category: "Notes",
    ownerId: "user_3",
    ownerName: "Rahul V.",
    college: "IIT Hyderabad (IITH)",
    status: "available",
    imageUrl: "https://picsum.photos/seed/notes/400/300",
    createdAt: Date.now() - 3600000 * 10,
  },
];
