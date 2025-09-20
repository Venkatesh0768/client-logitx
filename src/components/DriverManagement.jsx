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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { MenuItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { db } from "../firebaseConfig";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

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
  city: "",
  firstName: "",
  lastName: "",
  mobileNumber: "",
  state: "",
  vehicleNumber: "",
  last_completed_order: "",
  last_delivery_time: "",
  occupied: false,
  documents: {
    Aadhaar_or_PAN_Card: { publicId: "", url: "" },
    Driving_License: { publicId: "", url: "" },
    Insurance_Certificate: { publicId: "", url: "" },
    Vehicle_RC: { publicId: "", url: "" },
  },
};

const DriverManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
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
    driver: null,
  });
  const [loading, setLoading] = useState(true);
  const [editOriginal, setEditOriginal] = useState("");

  // Fetch drivers from Firestore
  const fetchDrivers = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const driversRef = collection(db, "Drivers");
      const driversQuery = query(driversRef, where("userId", "==", user.uid));
      const driversSnap = await getDocs(driversQuery);
      let allDrivers = [];
      driversSnap.forEach((doc) => {
        allDrivers.push({ id: doc.id, ...doc.data() });
      });
      setDrivers(allDrivers);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error fetching drivers: " + error.message,
        type: "error",
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    const lower = sanitize(search);
    setFiltered(
      drivers.filter((d) =>
        [
          d.firstName,
          d.lastName,
          d.mobileNumber,
          d.city,
          d.state,
          d.vehicleNumber,
        ].some((field) => sanitize(String(field)).includes(lower))
      )
    );
  }, [search, drivers]);

  const openForm = (mode, driver = null) => {
    setFormMode(mode);
    setFormData(driver || initialFormData);
    setErrors({});
    setDialogOpen(true);
    setEditOriginal(driver ? driver.id : "");
  };

  const closeForm = () => {
    setDialogOpen(false);
    setFormData(initialFormData);
  };

  const validate = () => {
    const temp = {
      firstName: formData.firstName ? "" : "Required",
      lastName: formData.lastName ? "" : "Required",
      mobileNumber: formData.mobileNumber ? "" : "Required",
      city: formData.city ? "" : "Required",
      state: formData.state ? "" : "Required",
      vehicleNumber: formData.vehicleNumber ? "" : "Required",
    };
    setErrors(temp);
    return Object.values(temp).every((x) => x === "");
  };

  // Dummy upload handler (replace with actual upload logic)
  const handleFileUpload = async (e, docType) => {
    // Simulate upload and set URL/publicId
    const file = e.target.files[0];
    if (!file) return;
    // Replace below with actual upload logic
    const fakeUrl = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docType]: {
          publicId: `drivers/${formData.mobileNumber}/${docType}`,
          url: fakeUrl,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!user) {
      setSnackbar({
        open: true,
        message: "User not authenticated",
        type: "error",
      });
      return;
    }
    
    try {
      const driverData = { ...formData, userId: user.uid };
      const driverDocRef = doc(db, "Drivers", formData.mobileNumber);
      await setDoc(driverDocRef, driverData, { merge: true });
      await fetchDrivers();
      setSnackbar({
        open: true,
        message: "Driver saved successfully",
        type: "success",
      });
      closeForm();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving driver: " + error.message,
        type: "error",
      });
    }
  };

  const handleDeleteConfirm = (driver) => {
    setConfirmDialog({ open: true, action: "delete", driver });
  };

  const handleEditConfirm = (driver) => {
    openForm("edit", driver);
  };

  const handleConfirmAction = async () => {
    const { action, driver } = confirmDialog;
    if (action === "delete") {
      try {
        await deleteDoc(doc(db, "Drivers", driver.id));
        await fetchDrivers();
        setSnackbar({ open: true, message: "Driver deleted", type: "warning" });
      } catch (error) {
        setSnackbar({
          open: true,
          message: "Error deleting: " + error.message,
          type: "error",
        });
      }
    }
    setConfirmDialog({ open: false, action: "", driver: null });
  };

  const handleView = (driver) => {
    setViewData(driver);
    setViewDialogOpen(true);
  };

  if (!user) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <Typography>Please log in to view drivers</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography
        variant="h4"
        sx={{ fontSize: { xs: 24, md: 40 } }}
        gutterBottom
      >
        Driver Management
      </Typography>

      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        alignItems={isMobile ? "stretch" : "center"}
        justifyContent="space-between"
        mt={4}
      >
        <TextField
          label="Search Drivers"
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
        <Button
          startIcon={<PersonAddIcon />}
          variant="contained"
          fullWidth={isMobile}
          onClick={() => openForm("add")}
        >
          Add Driver
        </Button>
      </Stack>

      <Paper elevation={3} sx={{ mt: 3, overflowX: "auto" }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
              <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>City</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Vehicle No</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((driver) => (
                  <TableRow key={driver.id} hover>
                    <TableCell>{driver.firstName}</TableCell>
                    <TableCell>{driver.lastName}</TableCell>
                    <TableCell>{driver.mobileNumber}</TableCell>
                    <TableCell>{driver.city}</TableCell>
                    <TableCell>{driver.state}</TableCell>
                    <TableCell>{driver.vehicleNumber}</TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <IconButton
                          onClick={() => handleView(driver)}
                          color="info"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleEditConfirm(driver)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteConfirm(driver)}
                          color="error"
                        >
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

      {/* Add/Edit Driver Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeForm}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {formMode === "add" ? "Add Driver" : "Edit Driver"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
              error={!!errors.firstName}
              helperText={errors.firstName}
              fullWidth
            />
            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
              error={!!errors.lastName}
              helperText={errors.lastName}
              fullWidth
            />
            <TextField
              label="Mobile Number"
              value={formData.mobileNumber}
              onChange={(e) =>
                setFormData({ ...formData, mobileNumber: e.target.value })
              }
              error={!!errors.mobileNumber}
              helperText={errors.mobileNumber}
              fullWidth
            />
            <TextField
              label="City"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              error={!!errors.city}
              helperText={errors.city}
              fullWidth
            />
            <TextField
              label="State"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              error={!!errors.state}
              helperText={errors.state}
              fullWidth
            />
            <TextField
              label="Vehicle Number"
              value={formData.vehicleNumber}
              onChange={(e) =>
                setFormData({ ...formData, vehicleNumber: e.target.value })
              }
              error={!!errors.vehicleNumber}
              helperText={errors.vehicleNumber}
              fullWidth
            />
            <TextField
              label="Last Completed Order"
              value={formData.last_completed_order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  last_completed_order: e.target.value,
                })
              }
              fullWidth
            />
            <TextField
              label="Last Delivery Time"
              value={formData.last_delivery_time}
              onChange={(e) =>
                setFormData({ ...formData, last_delivery_time: e.target.value })
              }
              fullWidth
            />
            <TextField
              select
              label="Occupied"
              value={formData.occupied ? "Yes" : "No"}
              onChange={(e) =>
                setFormData({ ...formData, occupied: e.target.value === "Yes" })
              }
              fullWidth
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </TextField>
            {/* Document Uploads */}
            <Typography variant="subtitle1">Documents</Typography>
            {[
              "Aadhaar_or_PAN_Card",
              "Driving_License",
              "Insurance_Certificate",
              "Vehicle_RC",
            ].map((docType) => (
              <Stack
                key={docType}
                direction="row"
                spacing={2}
                alignItems="center"
              >
                <Button variant="outlined" component="label">
                  Upload {docType.replace(/_/g, " ")}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, docType)}
                  />
                </Button>
                {formData.documents[docType]?.url && (
                  <a
                    href={formData.documents[docType].url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View
                  </a>
                )}
              </Stack>
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

      {/* View Driver Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Driver Details</DialogTitle>
        <DialogContent>
          {viewData && (
            <Stack spacing={2}>
              <Typography>
                <strong>First Name:</strong> {viewData.firstName}
              </Typography>
              <Typography>
                <strong>Last Name:</strong> {viewData.lastName}
              </Typography>
              <Typography>
                <strong>Mobile Number:</strong> {viewData.mobileNumber}
              </Typography>
              <Typography>
                <strong>City:</strong> {viewData.city}
              </Typography>
              <Typography>
                <strong>State:</strong> {viewData.state}
              </Typography>
              <Typography>
                <strong>Vehicle Number:</strong> {viewData.vehicleNumber}
              </Typography>
              <Typography>
                <strong>Last Completed Order:</strong>{" "}
                {viewData.last_completed_order}
              </Typography>
              <Typography>
                <strong>Last Delivery Time:</strong>{" "}
                {String(viewData.last_delivery_time)}
              </Typography>
              <Typography>
                <strong>Occupied:</strong> {viewData.occupied ? "Yes" : "No"}
              </Typography>
              <Typography variant="subtitle1">
                <strong>Documents:</strong>
              </Typography>
              {[
                "Aadhaar_or_PAN_Card",
                "Driving_License",
                "Insurance_Certificate",
                "Vehicle_RC",
              ].map((docType) => (
                <div key={docType}>
                  <Typography>
                    <strong>{docType.replace(/_/g, " ")}:</strong>
                  </Typography>
                  {viewData.documents?.[docType]?.url && (
                    <a
                      href={viewData.documents[docType].url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Document
                    </a>
                  )}
                </div>
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
              ? "Are you sure you want to delete this driver? This action cannot be undone."
              : "Are you sure you want to proceed with this action?"}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}
          >
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

export default DriverManagement;
