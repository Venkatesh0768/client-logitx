import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Alert,
  Stack,
  InputAdornment,
  Slide,
  DialogContentText,
  TableContainer,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import { db } from "../firebaseConfig"; // Adjust the import path as necessary
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import Chip from "@mui/material/Chip";

const Transition = React.forwardRef((props, ref) => (
  <Slide direction="up" ref={ref} {...props} />
));

const sanitize = (text) =>
  (text || "")
    .toString()
    .replace(/[*_`~]/g, "")
    .trim()
    .toLowerCase();

const initialFormData = {
  advance_amount: "",
  available_wheel: "",
  booking_date: "",
  booking_id: "",
  booking_status: "",
  capacity: "",
  company_name: "",
  createdAt: "",
  dest_lat: "",
  dest_lng: "",
  destination_address: "",
  distance: "",
  from_address: "",
  from_lat: "",
  from_lng: "",
  load: "",
  material: "",
  material_quantity: "",
  odc_breadth: "",
  odc_consignment: "",
  odc_height: "",
  odc_length: "",
  order_id: "",
  order_status: "",
  payment_id: "",
  payment_mode: "",
  payment_percentage: "",
  payment_status: "",
  pending_amount: "",
  price: "",
  status: "",
  subtype_vehicle: "",
  total_amount: "",
  transaction_date: "",
  user_email: "",
  user_name: "",
  user_phone: "",
  vehicle_type: "",
};

// Status filter options
const STATUS_FILTERS = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const OrderManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    type: "success",
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: "",
    order: null,
  });
  const [loading, setLoading] = useState(true);
  const [editOriginal, setEditOriginal] = useState("");

  // Fetch orders from Firestore
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, "AllOrders");
      const ordersSnap = await getDocs(ordersRef);
      let allOrders = [];
      ordersSnap.forEach((doc) => {
        allOrders.push({ id: doc.id, ...doc.data() });
      });
      setOrders(allOrders);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching orders: " + error.message,
        type: "error",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Enhanced filtering logic that includes both search and status filter
  useEffect(() => {
    let filteredOrders = orders;

    // Apply search filter
    if (search) {
      const lower = sanitize(search);
      filteredOrders = filteredOrders.filter((o) =>
        [
          o.order_id,
          o.user_name,
          o.user_phone,
          o.company_name,
          o.booking_status,
          o.order_status,
          o.vehicle_type,
          o.subtype_vehicle,
          o.material,
          o.destination_address,
        ].some((field) => sanitize(String(field)).includes(lower))
      );
    }

    // Apply status filter
    if (statusFilter) {
      filteredOrders = filteredOrders.filter((o) => {
        const orderStatus = sanitize(o.order_status);
        const bookingStatus = sanitize(o.booking_status);
        const filterValue = sanitize(statusFilter);
        
        // Check both order_status and booking_status fields
        return orderStatus === filterValue || bookingStatus === filterValue;
      });
    }

    setFiltered(filteredOrders);
  }, [search, statusFilter, orders]);

  const openForm = (mode, order = null) => {
    setFormMode(mode);
    setFormData(order || initialFormData);
    setErrors({});
    setDialogOpen(true);
    setEditOriginal(order ? order.id : "");
  };

  const closeForm = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
  };

  const validate = () => {
    const temp = {
      order_id: formData.order_id ? "" : "Required",
      user_name: formData.user_name ? "" : "Required",
      user_phone: formData.user_phone ? "" : "Required",
      company_name: formData.company_name ? "" : "Required",
      booking_status: formData.booking_status ? "" : "Required",
      order_status: formData.order_status ? "" : "Required",
      vehicle_type: formData.vehicle_type ? "" : "Required",
      material: formData.material ? "" : "Required",
      destination_address: formData.destination_address ? "" : "Required",
    };
    setErrors(temp);
    return Object.values(temp).every((x) => x === "");
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const orderDocRef = doc(db, "AllOrders", formData.order_id);
      await setDoc(orderDocRef, formData, { merge: true });
      await fetchOrders();
      setSnackbar({
        open: true,
        message: "Order saved successfully",
        type: "success",
      });
      closeForm();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving order: " + error.message,
        type: "error",
      });
    }
  };

  const handleDeleteConfirm = (order) => {
    setConfirmDialog({ open: true, action: "delete", order });
  };

  const handleEditConfirm = (order) => {
    openForm("edit", order);
  };

  const handleConfirmAction = async () => {
    const { action, order } = confirmDialog;
    if (action === "delete") {
      try {
        await deleteDoc(doc(db, "AllOrders", order.id));
        await fetchOrders();
        setSnackbar({ open: true, message: "Order deleted", type: "warning" });
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error deleting: " + error.message,
          type: "error",
        });
      }
    }
    setConfirmDialog({ open: false, action: "", order: null });
  };

  const handleView = (order) => {
    setViewData(order);
    setViewDialogOpen(true);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("");
  };

  // Helper for status color
  const getStatusColor = (status) => {
    switch (sanitize(status)) {
      case "pending":
        return "warning";
      case "confirmed":
        return "info";
      case "in-progress":
        return "primary";
      case "completed":
        return "success";
      case "cancelled":
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  const getPaymentColor = (status) => {
    switch (sanitize(status)) {
      case "partially paid":
        return "warning";
      case "full paid":
        return "success";
      case "pending":
        return "error";
      default:
        return "default";
    }
  };

  // Count orders by status for filter display
  const getStatusCount = (status) => {
    if (!status) return orders.length;
    return orders.filter(o => 
      sanitize(o.order_status) === sanitize(status) || 
      sanitize(o.booking_status) === sanitize(status)
    ).length;
  };

  return (
    <>
      <Typography variant="h4" sx={{ fontSize: { xs: 24, md: 40 } }} gutterBottom>
        Order Management
      </Typography>

      {/* Search and Filter Controls */}
      <Box sx={{ mt: 4, mb: 3 }}>
        <Stack
          direction={isMobile ? "column" : "row"}
          spacing={2}
          alignItems={isMobile ? "stretch" : "center"}
          justifyContent="space-between"
          mb={2}
        >
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            sx={{ width: isMobile ? "100%" : "auto" }}
          >
            <TextField
              label="Search Orders"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ width: isMobile ? "100%" : 300 }}
            />
            
            <FormControl size="small" sx={{ width: isMobile ? "100%" : 200 }}>
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Filter by Status"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListIcon sx={{ fontSize: 18, ml: 1 }} />
                  </InputAdornment>
                }
              >
                {STATUS_FILTERS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Stack direction="row" justifyContent="space-between" width="100%">
                      <span>{option.label}</span>
                      <Chip 
                        label={getStatusCount(option.value)} 
                        size="small" 
                        color="primary"
                        sx={{ ml: 1, minWidth: 40 }}
                      />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(search || statusFilter) && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                variant="outlined"
                size="small"
                sx={{ height: 40 }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>

          <Button
            startIcon={<AddCircleIcon />}
            variant="contained"
            fullWidth={isMobile}
            onClick={() => openForm("add")}
          >
            Add Order
          </Button>
        </Stack>

        {/* Active Filters Display */}
        {(search || statusFilter) && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {search && (
                <Chip
                  label={`Search: "${search}"`}
                  onDelete={() => setSearch("")}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {statusFilter && (
                <Chip
                  label={`Status: ${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}`}
                  onDelete={() => setStatusFilter("")}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        )}
      </Box>

      <Paper elevation={3} sx={{ mt: 3, overflowX: "auto" }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>User Name</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Material</TableCell>
                <TableCell>Booking Status</TableCell>
                <TableCell>Order Status</TableCell>
                <TableCell>Vehicle Type</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    {search || statusFilter ? "No orders match the current filters." : "No orders found."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.order_id}</TableCell>
                    <TableCell>{order.user_name}</TableCell>
                    <TableCell>{order.company_name}</TableCell>
                    <TableCell>{order.material}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.booking_status}
                        color={getStatusColor(order.booking_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.order_status}
                        color={getStatusColor(order.order_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{order.vehicle_type}</TableCell>
                    <TableCell>{order.destination_address}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.payment_status}
                        color={getPaymentColor(order.payment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton onClick={() => handleView(order)} color="info">
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton onClick={() => handleEditConfirm(order)} color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteConfirm(order)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filtered.length} of {orders.length} orders
          {(search || statusFilter) && " (filtered)"}
        </Typography>
      </Box>

      {/* Add/Edit Order Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeForm}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{formMode === "add" ? "Add Order" : "Edit Order"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {Object.keys(initialFormData).map((field) => (
              <TextField
                key={field}
                label={field.replace(/_/g, " ")}
                value={formData[field]}
                onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                error={!!errors[field]}
                helperText={errors[field]}
                fullWidth
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {formMode === "add" ? "Add" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Order Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent>
          {viewData && (
            <Stack spacing={2}>
              {Object.entries(viewData).map(([key, value]) => (
                <Typography key={key}>
                  <strong>{key.replace(/_/g, " ")}:</strong> {String(value)}
                </Typography>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        TransitionComponent={Transition}
      >
        <DialogTitle>
          {`Confirm ${
            confirmDialog.action === "delete" ? "Deletion" : "Action"
          }`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === "delete"
              ? "Are you sure you want to delete this order? This action cannot be undone."
              : "Are you sure you want to proceed with this action?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={confirmDialog.action === "delete" ? "error" : "primary"}
          >
            {confirmDialog.action === "delete" ? "Delete" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.type}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OrderManagement;