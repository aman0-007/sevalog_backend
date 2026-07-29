const AdminModel = require('../models/adminModel');

const adminController = {

    /**
     * Handler for summary calculations displayed on admin dashboard load
     */
    getAdminDashboardStats: async (req, res) => {
        try {
            const dashboardData = await AdminModel.getAdminDashboardStats();
            
            return res.status(200).json({ 
                success: true,
                message: "Admin dashboard stats retrieved successfully.",
                data: dashboardData 
            });
        } catch (error) {
            console.error('[Admin Dashboard Error]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to retrieve administrative dashboard statistics.' 
            });
        }
    },

    /**
     * Handler to view all registered volunteers with pagination and filtering
     */
    getAllVolunteers: async (req, res) => {
        try {
            const limit = parseInt(req.query.limit, 10) || 50;
            const offset = parseInt(req.query.offset, 10) || 0;

            const filters = {
                search: req.query.search || null,
                status: req.query.status || null,
                sortBy: req.query.sortBy || 'created',
                sortOrder: req.query.sortOrder || 'DESC',
                limit,
                offset
            };

            const { data, totalCount } = await AdminModel.getAllVolunteers(filters);
            
            return res.status(200).json({ 
                success: true, 
                pagination: {
                    totalRecords: totalCount,
                    pageSize: limit,
                    currentPage: Math.floor(offset / limit) + 1,
                    totalPages: Math.ceil(totalCount / limit)
                },
                data 
            });
        } catch (error) {
            console.error('[Admin Get Volunteers Error]:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Server error retrieving volunteer registry.' 
            });
        }
    },

    /**
     * Handler to view a single volunteer's full profile
     */
    getVolunteerProfile: async (req, res) => {
        try {
            const { id } = req.params;
            const profile = await AdminModel.getVolunteerDetails(id);
            
            if (!profile) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Volunteer not found.' 
                });
            }

            return res.status(200).json({ 
                success: true, 
                data: profile 
            });
        } catch (error) {
            console.error('[Admin Volunteer Profile Error]:', error);
            
            // Handle invalid UUID formats gracefully
            if (error.code === '22P02') {
                return res.status(400).json({ success: false, message: 'Invalid volunteer ID format.' });
            }

            return res.status(500).json({ 
                success: false, 
                message: 'Server error retrieving volunteer details.' 
            });
        }
    },

    /**
     * Soft-delete a volunteer account
     */
    deactivateVolunteerAccount: async (req, res) => {
        try {
            const { id: volunteerId } = req.params;
            const adminId = req.user.userId;

            await AdminModel.deactivateVolunteer(volunteerId, adminId);

            return res.status(200).json({
                success: true,
                message: 'Volunteer account deactivated and withdrawn from upcoming events.'
            });
        } catch (error) {
            if (error.message === "USER_NOT_FOUND") {
                return res.status(404).json({ success: false, message: "Volunteer not found or already deactivated." });
            }
            console.error('[Deactivate Volunteer Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to deactivate volunteer.' });
        }
    }
};

module.exports = adminController;