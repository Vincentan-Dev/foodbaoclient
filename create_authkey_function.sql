-- Create the authkey RPC function for URL-based authentication
-- This function allows authentication using just a username (for trusted URLs)

CREATE OR REPLACE FUNCTION authkey(p_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
    v_result JSON;
BEGIN
    -- Validate input
    IF p_username IS NULL OR trim(p_username) = '' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Username is required'
        );
    END IF;
    
    -- Try to find user with case-insensitive search
    -- First try exact match, then uppercase, then lowercase
    SELECT * INTO v_user FROM userfile WHERE USERNAME = p_username;
    
    IF NOT FOUND THEN
        SELECT * INTO v_user FROM userfile WHERE USERNAME = upper(p_username);
    END IF;
    
    IF NOT FOUND THEN
        SELECT * INTO v_user FROM userfile WHERE USERNAME = lower(p_username);
    END IF;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Check if user is active
    IF v_user.STATUS != 'ACTIVE' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User account is not active'
        );
    END IF;
    
    -- Update last login timestamp
    UPDATE userfile 
    SET LAST_LOGIN = NOW() 
    WHERE ID = v_user.ID;
    
    -- Return successful authentication with user data
    v_result := json_build_object(
        'success', true,
        'message', 'Authentication successful',
        'user', json_build_object(
            'ID', v_user.ID,
            'USERNAME', v_user.USERNAME,
            'EMAIL', v_user.EMAIL,
            'USER_ROLE', v_user.USER_ROLE,
            'BUSINESSNAME', v_user.BUSINESSNAME,
            'CLIENT_ID', v_user.CLIENT_ID,
            'STATUS', v_user.STATUS
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Authentication error: ' || SQLERRM
        );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION authkey(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION authkey(TEXT) TO anon;
