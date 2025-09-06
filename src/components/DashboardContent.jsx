import React, { useEffect, useState } from "react";
import {
  Typography,
  Grid,
  Paper,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import CountUp from "react-countup";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, getDocs } from "firebase/firestore";
import { IndianRupee } from "lucide-react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DashboardContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State for dynamic data
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [vehiclesInUse, setVehiclesInUse] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [kycPending, setKycPending] = useState(false);


  useEffect(() => {
    // Fetch total orders
    const fetchOrders = async () => {
      const snap = await getDocs(collection(db, "AllOrders"));
      setTotalOrders(snap.size);

      // Calculate total revenue from orders
      let revenue = 0;
      const revenueByMonth = {};

      snap.forEach((doc) => {
        const data = doc.data();
        // Parse price or total_amount
        let amount = 0;
        if (data.price) {
          const num = Number(String(data.price).replace(/[^\d.]/g, ""));
          if (!isNaN(num)) amount = num;
        } else if (data.total_amount) {
          const num = Number(data.total_amount);
          if (!isNaN(num)) amount = num;
        }
        revenue += amount;

        // Parse month from createdAt or booking_date
        let dateObj;
        if (data.createdAt && data.createdAt.toDate) {
          dateObj = data.createdAt.toDate();
        } else if (data.booking_date) {
          dateObj = new Date(data.booking_date);
        }
        if (dateObj) {
          const month = dateObj.toLocaleString("default", { month: "short" });
          const year = dateObj.getFullYear();
          const key = `${month} ${year}`;
          revenueByMonth[key] = (revenueByMonth[key] || 0) + amount;
        }
      });

      setTotalRevenue(revenue);

      // Prepare chart data (last 6 months)
      const sortedMonths = Object.keys(revenueByMonth)
        .sort((a, b) => new Date(a) - new Date(b))
        .slice(-6);
      setMonthlyRevenue(
        sortedMonths.map((m) => ({
          label: m,
          value: revenueByMonth[m],
        }))
      );
    };

    // Fetch active drivers
    const fetchDrivers = async () => {
      const snap = await getDocs(collection(db, "Drivers"));
      setActiveDrivers(snap.size);
    };

    // Fetch vehicles in use (example: count all vehicles)
    const fetchVehicles = async () => {
      const snap = await getDocs(collection(db, "Vehicles"));
      setVehiclesInUse(snap.size);
    };

    fetchOrders();
    fetchDrivers();
    fetchVehicles();
  }, []);

  // Chart data from monthlyRevenue state
  const revenueData = {
    labels: monthlyRevenue.map((m) => m.label),
    datasets: [
      {
        label: "Revenue (₹)",
        data: monthlyRevenue.map((m) => m.value),
        backgroundColor: "rgba(25, 118, 210, 0.7)",
        borderRadius: 6,
        hoverBackgroundColor: "rgba(25, 118, 210, 1)",
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Monthly Revenue",
        font: { size: 18 },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (value) => `₹${value / 1000}K`,
        },
        beginAtZero: true,
      },
    },
  };

  const cardData = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: <ShoppingCartIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Active Drivers",
      value: activeDrivers,
      icon: <LocalShippingIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Vehicles In Use",
      value: vehiclesInUse,
      icon: <DirectionsCarIcon color="primary" sx={{ fontSize: 40 }} />,
    },
    {
      title: "Total Revenue",
      value: totalRevenue,
      prefix: "₹",
      icon: (
        <CurrencyRupeeIcon size={40} color="primary" sx={{ fontSize: 40 }} />
      ),
    },
  ];

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontSize: { xs: 24, md: 40 } }}
      >
        Dashboard Overview
      </Typography>
      <hr />

      {/* Summary Cards */}
      <Grid
        container
        spacing={isMobile ? 7 : 4}
        justifyContent={isMobile ? "center" : "flex-start"}
        sx={{ 
          mb: { xs: 2, sm: 3, md: 4 },
          mt: { xs: 2, sm: 3, md: 4 },
        }}
      >
        {cardData.map((card, idx) => (
          <Grid key={idx} item xs={12} sm={6} md={3}>
            <Box display="flex" justifyContent="center">
              <Paper
                elevation={4}
                sx={{
                  width: "100%",
                  maxWidth: 280,
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  transition: "0.3s",
                  "&:hover": {
                    boxShadow: 6,
                    transform: "scale(1.03)",
                  },
                }}
              >
                {card.icon}
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h5" fontWeight={600}>
                  {card.title === "Total Revenue" ? (
                    `₹ ${new Intl.NumberFormat("en-IN").format(card.value)}`
                  ) : (
                    <CountUp
                      start={0}
                      end={card.value}
                      duration={1.5}
                      prefix={card.prefix || ""}
                      separator=","
                    />
                  )}
                </Typography>
              </Paper>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Revenue Chart */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          overflowX: "auto",
          height: { xs: 300, md: 400 },
          mt: 4,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          sx={{ fontSize: { xs: 18, md: 30 } }}
        >
          Revenue Statistics
        </Typography>
        <Box sx={{ minWidth: 420, height: "100%" }}>
          <Bar data={revenueData} options={revenueOptions} />
        </Box>
      </Paper>
    </Box>
  );
};

export default DashboardContent;
