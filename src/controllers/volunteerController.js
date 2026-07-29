const VolunteerModel = require('../models/volunteerModel');

const volunteerController = {

     /**
     * Handler to get the volunteer's own profile
     */
    getMyProfile: async (req, res) => {
        try {
            const userId = req.user.userId;
            const profile = await VolunteerModel.getProfile(userId);
            
            if (!profile) {
                return res.status(404).json({ success: false, message: 'Profile not found.' });
            }
            
            return res.status(200).json({ 
                success: true, 
                data: profile 
            });
        } catch (error) {
            console.error('[Volunteer Profile Fetch Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve profile data.' });
        }
    },

    /**
     * Handler to update the volunteer profile fields
     */
    updateMyProfile: async (req, res) => {
        try {
            const userId = req.user.userId;

            // Database Constraint Validation (chk_college_or_profession)
            const { collegeName, profession } = req.body;
            if (!collegeName && !profession) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Profile update failed: Either College Name or Profession must be provided." 
                });
            }

            const updatedUser = await VolunteerModel.updateProfile(userId, req.body);
            
            if (!updatedUser) {
                return res.status(404).json({ success: false, message: 'Volunteer profile not found or inactive.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                data: updatedUser
            });
        } catch (error) {
            console.error('[Volunteer Profile Update Error]:', error);
            
            // Handle specific Postgres ENUM casting errors gracefully
            if (error.code === '22P02') {
                return res.status(400).json({ success: false, message: 'Invalid data format provided (e.g., Blood Group or Gender).' });
            }
            return res.status(500).json({ success: false, message: 'Server error during profile update.' });
        }
    },

    /**
     * Handler to get data for the volunteer home dashboard screen
     */
    getMyDashboard: async (req, res) => {
        try {
            const userId = req.user.userId;
            const dashboardData = await VolunteerModel.getDashboardData(userId);
            
            return res.status(200).json({ 
                success: true, 
                data: dashboardData 
            });
        } catch (error) {
            console.error('[Volunteer Dashboard Fetch Error]:', error);
            return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard data.' });
        }
    }
};

module.exports = volunteerController;