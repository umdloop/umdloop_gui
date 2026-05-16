"use client";

export const MISSIONS = [
  {
    id: "delivery",
    name: "Delivery Mission",
    roles: [
      { id: "rover-technician", name: "Rover Technician" },
      { id: "arm-operator", name: "Arm Operator" },
      { id: "rover-operator", name: "Rover Operator" },
      { id: "navigator", name: "Navigator" },
      { id: "drone-operator", name: "Drone Operator" },
    ],
  },
  {
    id: "equipment-servicing",
    name: "Equipment Servicing Mission",
    roles: [
      { id: "rover-technician", name: "Rover Technician" },
      { id: "arm-operator", name: "Arm Operator" },
      { id: "rover-operator", name: "Rover Operator" },
      { id: "auxiliary-1", name: "Auxiliary #1" },
      { id: "auxiliary-2", name: "Auxiliary #2" },
    ],
  },
  {
    id: "science",
    name: "Science Mission",
    roles: [
      { id: "rover-technician", name: "Rover Technician" },
      { id: "science-equipment-operator", name: "Science Equipment Operator" },
      { id: "spectrometer-scientist", name: "Spectrometer Scientist" },
      { id: "fluorometer-scientist", name: "Fluorometer Scientist" },
      { id: "rover-operator", name: "Rover Operator" },
    ],
  },
  {
    id: "autonomous-navigation",
    name: "Autonomous Navigation Mission",
    roles: [
      { id: "rover-technician", name: "Rover Technician" },
      { id: "camera-operator", name: "Camera Operator" },
      { id: "software-specialist", name: "Software Specialist" },
      { id: "navigator", name: "Navigator" },
      { id: "rover-operator", name: "Rover Operator" },
    ],
  },
];
